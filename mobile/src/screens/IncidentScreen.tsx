import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { fr } from '../i18n/fr';
import { mg } from '../i18n/mg';
import { saveIncidentOffline } from '../services/database';
import { reportIncident } from '../services/api';

const i18n = { fr, mg };
type Lang = 'fr' | 'mg';
const INCIDENT_TYPES = ['droneDown', 'wrongDelivery', 'missingProducts', 'patientRefused', 'other'] as const;

export default function IncidentScreen({ navigation }: any) {
  const [lang, setLang] = useState<Lang>('fr');
  const t = i18n[lang];
  const [incident, setIncident] = useState({ type: 'other', description: '', orderId: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!incident.description) { Alert.alert('Erreur', 'Description requise'); return; }
    setSubmitting(true);
    const data = { ...incident, id: Date.now().toString(), reportedAt: new Date().toISOString() };
    try { await reportIncident(data); }
    catch { await saveIncidentOffline(data); }
    Alert.alert(t.incident.success);
    navigation.goBack();
    setSubmitting(false);
  }

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
  submitBtn: { backgroundColor: '#ea4335', padding: 16, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
