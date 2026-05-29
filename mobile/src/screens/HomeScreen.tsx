import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fr } from '../i18n/fr';
import { mg } from '../i18n/mg';
import { getPendingOrders, getAllOrders } from '../services/database';
import { getMyOrders } from '../services/api';

const i18n = { fr, mg };
type Lang = 'fr' | 'mg';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [lang, setLang] = useState<Lang>('fr');
  const t = i18n[lang];
  const [pending, setPending] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [remoteOrders, setRemoteOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    loadOrders();
    loadRemote();
  }, []));

  async function loadOrders() {
    setLoading(true);
    const p = await getPendingOrders();
    const a = await getAllOrders();
    setPending(p);
    setAllOrders(a);
    setLoading(false);
  }

  async function loadRemote() {
    try { const data = await getMyOrders(); setRemoteOrders(Array.isArray(data) ? data : []); }
    catch { /* offline */ }
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t.app.title}</Text>
        <Text style={s.subtitle}>{t.app.subtitle}</Text>
        <View style={s.topRow}>
          <TouchableOpacity style={s.langBtn} onPress={() => setLang(lang === 'fr' ? 'mg' : 'fr')}>
            <Text style={s.langText}>{lang === 'fr' ? 'MG' : 'FR'}</Text>
          </TouchableOpacity>
          {user && (
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
              <Text style={s.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          )}
        </View>
        {user && <Text style={s.welcome}>Bienvenue, {user.name || user.email}</Text>}
      </View>

      <View style={s.grid}>
        <TouchableOpacity style={s.card} onPress={() => navigation.navigate('NewOrder')}>
          <Text style={s.cardIcon}>📦</Text>
          <Text style={s.cardText}>{t.home.newOrder}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Tracking')}>
          <Text style={s.cardIcon}>🛸</Text>
          <Text style={s.cardText}>{t.home.tracking}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Incident')}>
          <Text style={s.cardIcon}>⚠️</Text>
          <Text style={s.cardText}>{t.home.incidents}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.card} onPress={loadOrders}>
          <Text style={s.cardIcon}>🔄</Text>
          <Text style={s.cardText}>{t.home.sync}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>{t.home.pending} ({pending.length})</Text>
      {loading ? <ActivityIndicator /> : pending.length === 0 ? (
        <Text style={s.empty}>{t.home.noPending}</Text>
      ) : (
        <FlatList data={allOrders.slice().reverse()} keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={s.orderItem}>
              <Text style={s.orderName}>{item.patientName || 'N/A'} - {item.urgency || 'N/A'}</Text>
              <Text style={s.orderStatus}>{item.synced ? '✔ Synced' : '⏳ Pending'}</Text>
            </View>
          )}
        />
      )}

      {remoteOrders.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Commandes serveur ({remoteOrders.length})</Text>
          <FlatList data={remoteOrders.slice(-5).reverse()} keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={s.orderItem}>
                <Text style={s.orderName}>{item.patientName || 'N/A'} - {item.status}</Text>
                <Text style={s.orderStatus}>{new Date(item.createdAt || item.created_at).toLocaleDateString()}</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 16 },
  header: { marginBottom: 24, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a73e8', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  langBtn: { backgroundColor: '#1a73e8', padding: 6, borderRadius: 8 },
  langText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  logoutBtn: { backgroundColor: '#ea4335', padding: 6, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  welcome: { textAlign: 'center', color: '#555', marginTop: 8, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: { width: '46%', backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', elevation: 2 },
  cardIcon: { fontSize: 32 },
  cardText: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 },
  orderItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  orderName: { fontSize: 14, color: '#333', fontWeight: '500', flex: 1 },
  orderStatus: { fontSize: 12, color: '#666' },
});
