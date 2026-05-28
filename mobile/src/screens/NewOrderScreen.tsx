import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { fr } from '../i18n/fr';
import { mg } from '../i18n/mg';
import { saveOrderOffline, getCachedCenters } from '../services/database';
import { submitOrder } from '../services/api';

const i18n = { fr, mg };
type Lang = 'fr' | 'mg';

const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function SimplePicker({ label, value, items, onValueChange }: { label: string; value: string; items: { label: string; value: string }[]; onValueChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <TouchableOpacity style={s.pickerBtn} onPress={() => setVisible(true)}>
        <Text style={s.pickerBtnText}>{items.find(i => i.value === value)?.label || value}</Text>
        <Text style={s.pickerArrow}>▼</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} onPress={() => setVisible(false)}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{label}</Text>
            <FlatList data={items} keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.modalItem} onPress={() => { onValueChange(item.value); setVisible(false); }}>
                  <Text style={[s.modalItemText, item.value === value && s.modalItemActive]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function NewOrderScreen({ navigation }: any) {
  const [lang, setLang] = useState<Lang>('fr');
  const t = i18n[lang];
  const [form, setForm] = useState({ patientName: '', age: '', sex: 'male', contact: '', bloodGroup: 'O+', symptoms: '', products: '', urgency: 'medium', centerId: '' });
  const [centers, setCenters] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadCenters(); }, []);

  async function loadCenters() {
    const cached = await getCachedCenters();
    setCenters(cached);
  }

  async function handleSubmit() {
    if (!form.patientName || !form.age) { Alert.alert('Erreur', 'Nom et âge requis'); return; }
    setSubmitting(true);
    const order = { ...form, age: parseInt(form.age), id: Date.now().toString() };
    await saveOrderOffline(order);
    try { await submitOrder(order); } catch {}
    Alert.alert('Succès', t.order.success);
    setSubmitting(false);
    navigation.goBack();
  }

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t.order.title}</Text>
        <TouchableOpacity style={s.langBtn} onPress={() => setLang(lang === 'fr' ? 'mg' : 'fr')}>
          <Text style={s.langText}>{lang === 'fr' ? 'MG' : 'FR'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.label}>{t.order.patientName}</Text>
      <TextInput style={s.input} value={form.patientName} onChangeText={(v) => update('patientName', v)} />

      <Text style={s.label}>{t.order.age}</Text>
      <TextInput style={s.input} value={form.age} onChangeText={(v) => update('age', v)} keyboardType="numeric" />

      <Text style={s.label}>{t.order.sex}</Text>
      <View style={s.row}>
        <TouchableOpacity style={[s.radio, form.sex === 'male' && s.radioActive]} onPress={() => update('sex', 'male')}>
          <Text style={[s.radioText, form.sex === 'male' && s.radioTextActive]}>{t.order.male}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.radio, form.sex === 'female' && s.radioActive]} onPress={() => update('sex', 'female')}>
          <Text style={[s.radioText, form.sex === 'female' && s.radioTextActive]}>{t.order.female}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.label}>{t.order.contact}</Text>
      <TextInput style={s.input} value={form.contact} onChangeText={(v) => update('contact', v)} keyboardType="phone-pad" />

      <Text style={s.label}>{t.order.bloodGroup}</Text>
      <SimplePicker label={t.order.bloodGroup} value={form.bloodGroup} items={BLOOD_GROUPS.map(bg => ({ label: bg, value: bg }))} onValueChange={(v) => update('bloodGroup', v)} />

      <Text style={s.label}>{t.order.symptoms}</Text>
      <TextInput style={[s.input, s.textArea]} value={form.symptoms} onChangeText={(v) => update('symptoms', v)} multiline />

      <Text style={s.label}>{t.order.products}</Text>
      <TextInput style={[s.input, s.textArea]} value={form.products} onChangeText={(v) => update('products', v)} multiline />

      <Text style={s.label}>{t.order.urgency}</Text>
      <SimplePicker label={t.order.urgency} value={form.urgency} items={URGENCY_LEVELS.map(u => ({ label: (t.order as any)[u], value: u }))} onValueChange={(v) => update('urgency', v)} />

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{t.order.submit}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 16 },
  header: { alignItems: 'center', marginBottom: 20, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a73e8' },
  langBtn: { position: 'absolute', right: 0, top: 20, backgroundColor: '#1a73e8', padding: 8, borderRadius: 8 },
  langText: { color: '#fff', fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  radio: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  radioActive: { borderColor: '#1a73e8', backgroundColor: '#e3f0ff' },
  radioText: { color: '#666' },
  radioTextActive: { color: '#1a73e8', fontWeight: '700' },
  pickerBtn: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerBtnText: { fontSize: 15, color: '#333' },
  pickerArrow: { fontSize: 12, color: '#999' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%', padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalItemActive: { color: '#1a73e8', fontWeight: '700' },
  submitBtn: { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
