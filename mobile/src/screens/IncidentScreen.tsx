import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { fr } from '../i18n/fr';
import { mg } from '../i18n/mg';
import { saveIncidentOffline } from '../services/database';
import { reportIncident } from '../services/api';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';

const i18n = { fr, mg };
type Lang = 'fr' | 'mg';
const INCIDENT_TYPES = ['droneDown', 'wrongDelivery', 'missingProducts', 'patientRefused', 'other'] as const;

export default function IncidentScreen({ navigation }: any) {
  const [lang, setLang] = useState<Lang>('fr');
  const t = i18n[lang];
  const [incident, setIncident] = useState({ type: 'other', description: '', orderId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('chargement...');
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocationStatus(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      } else {
        setLocationStatus('non disponible');
      }
    })();
  }, []);

  async function takePhoto() {
    if (!cameraRef.current) return;
    try {
      const photoData = await cameraRef.current.takePicture({ quality: 0.7 });
      setPhoto(photoData.uri);
      setCameraVisible(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  }

  async function handleSubmit() {
    if (!incident.description) { Alert.alert('Erreur', 'Description requise'); return; }
    setSubmitting(true);
    const data = {
      ...incident,
      id: Date.now().toString(),
      reportedAt: new Date().toISOString(),
      lat: location?.lat,
      lng: location?.lng,
      photoUri: photo,
    };
    try { await reportIncident(data); }
    catch { await saveIncidentOffline(data); }
    Alert.alert(t.incident.success);
    navigation.goBack();
    setSubmitting(false);
  }

  const hasCameraPermission = cameraPermission?.granted;

  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>{t.incident.title}</Text>
      <TouchableOpacity style={s.langBtn} onPress={() => setLang(lang === 'fr' ? 'mg' : 'fr')}>
        <Text style={s.langBtnText}>{lang === 'fr' ? 'MG' : 'FR'}</Text>
      </TouchableOpacity>

      <Text style={s.label}>{t.incident.type}</Text>
      <View style={s.row}>
        {INCIDENT_TYPES.map((type) => (
          <TouchableOpacity key={type} style={[s.chip, incident.type === type && s.chipActive]} onPress={() => setIncident({ ...incident, type })}>
            <Text style={[s.chipText, incident.type === type && s.chipTextActive]}>{(t.incident.types as any)[type]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>{t.incident.description}</Text>
      <TextInput style={[s.input, s.textArea]} value={incident.description} onChangeText={(v) => setIncident({ ...incident, description: v })} multiline />

      <Text style={s.label}>📍 Position GPS: {locationStatus}</Text>

      {photo ? (
        <View style={s.photoPreview}>
          <Image source={{ uri: photo }} style={s.photoImage} />
          <TouchableOpacity style={s.retakeBtn} onPress={() => setCameraVisible(true)}>
            <Text style={s.retakeText}>Reprendre photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.photoBtn} onPress={() => setCameraVisible(true)} disabled={!hasCameraPermission}>
          <Text style={s.photoBtnText}>{!hasCameraPermission ? 'Caméra non disponible' : '📷 Prendre une photo'}</Text>
        </TouchableOpacity>
      )}

      {cameraVisible && (
        <View style={s.cameraContainer}>
          <CameraView ref={cameraRef} style={s.camera} facing="back" />
          <View style={s.cameraActions}>
            <TouchableOpacity style={s.captureBtn} onPress={takePhoto}>
              <Text style={s.captureText}>📸 Capturer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelCameraBtn} onPress={() => { setCameraVisible(false); setPhoto(null); }}>
              <Text style={s.cancelCameraText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>{t.incident.submit}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a73e8', textAlign: 'center', marginTop: 20, marginBottom: 20 },
  langBtn: { position: 'absolute', right: 16, top: 24, backgroundColor: '#1a73e8', padding: 8, borderRadius: 8 },
  langBtnText: { color: '#fff', fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  photoBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', marginTop: 12 },
  photoBtnText: { fontSize: 15, color: '#333', fontWeight: '600' },
  photoPreview: { marginTop: 12, alignItems: 'center' },
  photoImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 8 },
  retakeBtn: { backgroundColor: '#fbbc04', padding: 8, borderRadius: 8 },
  retakeText: { fontWeight: '600', color: '#333' },
  cameraContainer: { height: 400, marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  camera: { flex: 1 },
  cameraActions: { flexDirection: 'row', justifyContent: 'center', gap: 16, padding: 12, backgroundColor: '#000' },
  captureBtn: { backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  captureText: { fontSize: 16, fontWeight: '700' },
  cancelCameraBtn: { backgroundColor: '#ea4335', padding: 12, borderRadius: 8 },
  cancelCameraText: { color: '#fff', fontWeight: '700' },
  submitBtn: { backgroundColor: '#ea4335', padding: 16, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
