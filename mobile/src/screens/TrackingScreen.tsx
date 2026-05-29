import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, FlatList, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { fr } from '../i18n/fr';
import { mg } from '../i18n/mg';
import Constants from 'expo-constants';
import { getActiveDeliveries, confirmDelivery } from '../services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';

const i18n = { fr, mg };
type Lang = 'fr' | 'mg';
const { width } = Dimensions.get('window');

export default function TrackingScreen({ navigation }: any) {
  const [lang, setLang] = useState<Lang>('fr');
  const t = i18n[lang];
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [cameraPermission] = useCameraPermissions();
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadFlights();
    connectWs();
    const interval = setInterval(loadFlights, 10000);
    return () => { clearInterval(interval); ws.current?.close(); };
  }, []);

  function connectWs() {
    try {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api/v1';
      const wsUrl = apiUrl.replace(/^http/, 'ws').replace('/api/v1', '') + '/ws';
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = (e) => {
        try { const msg = JSON.parse(e.data); if (msg.type === 'drone:update' || msg.type === 'fleet:snapshot') loadFlights(); }
        catch {}
      };
    } catch {}
  }

  async function loadFlights() {
    try { const data = await getActiveDeliveries(); setFlights(Array.isArray(data) ? data : []); }
    catch { setFlights([]); }
    setLoading(false);
  }

  async function handleConfirm(orderId: string) {
    if (!code) { Alert.alert('Erreur', t.tracking.deliveryCode); return; }
    setConfirming(true);
    try {
      await confirmDelivery(orderId, code);
      Alert.alert(t.tracking.success);
      setCode('');
      setSelectedOrder(null);
      loadFlights();
    } catch { Alert.alert(t.tracking.errorCode); }
    setConfirming(false);
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    setQrVisible(false);
    setCode(data);
    if (selectedOrder) {
      setConfirming(true);
      confirmDelivery(selectedOrder, data)
        .then(() => {
          Alert.alert(t.tracking.success);
          setCode('');
          setSelectedOrder(null);
          loadFlights();
        })
        .catch(() => Alert.alert(t.tracking.errorCode))
        .finally(() => setConfirming(false));
    }
  }

  function openMap(flight: any) {
    setSelectedFlight(flight);
  }

  const hasCameraPermission = cameraPermission?.granted;

  return (
    <View style={s.container}>
      <Text style={s.title}>{t.tracking.title}</Text>
      <TouchableOpacity style={s.langBtn} onPress={() => setLang(lang === 'fr' ? 'mg' : 'fr')}>
        <Text style={s.langBtnText}>{lang === 'fr' ? 'MG' : 'FR'}</Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : flights.length === 0 ? (
        <Text style={s.empty}>{t.tracking.noActive}</Text>
      ) : (
        <FlatList data={flights} keyExtractor={(item) => item.id || item.orderId}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.droneName}>{t.tracking.drone}: {item.droneId || item.droneName}</Text>
              <Text>{t.tracking.status}: {item.status}</Text>
              <Text>{t.tracking.battery}: {item.battery != null ? `${item.battery}%` : 'N/A'}</Text>
              <Text>{t.tracking.position}: {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}</Text>
              <View style={s.cardActions}>
                {item.lat && item.lng && (
                  <TouchableOpacity style={s.mapBtn} onPress={() => openMap(item)}>
                    <Text style={s.mapBtnText}>🗺️ Carte</Text>
                  </TouchableOpacity>
                )}
                {item.orderId && (
                  <TouchableOpacity style={s.confirmBtn} onPress={() => setSelectedOrder(item.orderId)}>
                    <Text style={s.confirmBtnText}>{t.tracking.confirm}</Text>
                  </TouchableOpacity>
                )}
                {item.orderId && hasCameraPermission && (
                  <TouchableOpacity style={s.qrBtn} onPress={() => { setSelectedOrder(item.orderId); setQrVisible(true); }}>
                    <Text style={s.qrBtnText}>{t.tracking.qrCode}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {selectedOrder === item.orderId && (
                <View style={s.codeBox}>
                  <Text style={s.label}>{t.tracking.deliveryCode}</Text>
                  <TextInput style={s.input} value={code} onChangeText={setCode} placeholder="000000" keyboardType="number-pad" maxLength={6} />
                  <TouchableOpacity style={s.submitBtn} onPress={() => handleConfirm(item.orderId)} disabled={confirming}>
                    {confirming ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>{t.tracking.confirmDelivery}</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {selectedFlight && selectedFlight.lat && selectedFlight.lng && (
        <Modal visible={!!selectedFlight} transparent animationType="slide">
          <View style={s.mapModal}>
            <Text style={s.mapTitle}>Drone {selectedFlight.droneId || ''}</Text>
            <View style={s.mapPlaceholder}>
              <Text style={s.mapPlaceholderText}>
                🗺️ Carte - {selectedFlight.lat?.toFixed(4)}, {selectedFlight.lng?.toFixed(4)}
                {'\n'}(Carte intégrée via WebView disponible sur appareil)
              </Text>
            </View>
            <TouchableOpacity style={s.closeMapBtn} onPress={() => setSelectedFlight(null)}>
              <Text style={s.closeMapText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {qrVisible && (
        <Modal visible={qrVisible} transparent animationType="slide">
          <View style={s.qrModal}>
            <Text style={s.qrTitle}>{t.tracking.qrCode}</Text>
            {!hasCameraPermission ? (
              <Text style={s.qrError}>Permission caméra refusée</Text>
            ) : (
              <CameraView
                style={s.camera}
                facing="back"
                onBarcodeScanned={handleBarcodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              />
            )}
            <TouchableOpacity style={s.closeQrBtn} onPress={() => setQrVisible(false)}>
              <Text style={s.closeQrText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a73e8', textAlign: 'center', marginTop: 40, marginBottom: 20 },
  langBtn: { position: 'absolute', right: 16, top: 44, backgroundColor: '#1a73e8', padding: 8, borderRadius: 8 },
  langBtnText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#999', marginTop: 60, fontSize: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  droneName: { fontSize: 16, fontWeight: '700', color: '#1a73e8', marginBottom: 4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  mapBtn: { backgroundColor: '#34a853', padding: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  mapBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  confirmBtn: { backgroundColor: '#1a73e8', padding: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  qrBtn: { backgroundColor: '#9334e6', padding: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  qrBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  codeBox: { marginTop: 12, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 10, fontSize: 18, textAlign: 'center', borderWidth: 1, borderColor: '#ddd', letterSpacing: 8 },
  submitBtn: { backgroundColor: '#1a73e8', padding: 12, borderRadius: 8, marginTop: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  mapModal: { flex: 1, backgroundColor: '#f0f4f8', paddingTop: 60, padding: 16 },
  mapTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a73e8', textAlign: 'center', marginBottom: 16 },
  mapPlaceholder: { flex: 1, backgroundColor: '#e8e8e8', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  mapPlaceholderText: { fontSize: 16, color: '#666', textAlign: 'center', padding: 20 },
  closeMapBtn: { backgroundColor: '#ea4335', padding: 14, borderRadius: 8, alignItems: 'center' },
  closeMapText: { color: '#fff', fontWeight: '700' },
  qrModal: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  qrTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, marginTop: 60 },
  qrError: { color: '#ff6b6b', fontSize: 16 },
  camera: { width: width * 0.8, height: width * 0.8 },
  closeQrBtn: { backgroundColor: '#ea4335', padding: 14, borderRadius: 8, marginTop: 20, marginBottom: 40 },
  closeQrText: { color: '#fff', fontWeight: '700' },
});
