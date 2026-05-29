import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fr } from '../i18n/fr';
import { mg } from '../i18n/mg';

const i18n = { fr, mg };
type Lang = 'fr' | 'mg';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [lang, setLang] = useState<Lang>('fr');
  const t = i18n[lang];
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('agent');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { Alert.alert('Erreur', 'Email et mot de passe requis'); return; }
    if (mode === 'register' && !name) { Alert.alert('Erreur', 'Nom requis'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ email, password, name, role });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Erreur';
      Alert.alert('Erreur', msg);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner}>
        <Text style={s.title}>DroneMed</Text>
        <Text style={s.subtitle}>{t.app.subtitle}</Text>

        <TouchableOpacity style={s.langBtn} onPress={() => setLang(lang === 'fr' ? 'mg' : 'fr')}>
          <Text style={s.langText}>{lang === 'fr' ? 'MG' : 'FR'}</Text>
        </TouchableOpacity>

        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, mode === 'login' && s.tabActive]} onPress={() => setMode('login')}>
            <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Connexion</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, mode === 'register' && s.tabActive]} onPress={() => setMode('register')}>
            <Text style={[s.tabText, mode === 'register' && s.tabTextActive]}>Inscription</Text>
          </TouchableOpacity>
        </View>

        {mode === 'register' && (
          <>
            <Text style={s.label}>Nom complet</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} autoCapitalize="words" />
          </>
        )}

        <Text style={s.label}>Email</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        <Text style={s.label}>Mot de passe</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />

        {mode === 'register' && (
          <>
            <Text style={s.label}>Rôle</Text>
            <View style={s.row}>
              {['agent', 'pharmacien'].map((r) => (
                <TouchableOpacity key={r} style={[s.radio, role === r && s.radioActive]} onPress={() => setRole(r)}>
                  <Text style={[s.radioText, role === r && s.radioTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{mode === 'login' ? 'Se connecter' : "S'inscrire"}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a73e8', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  langBtn: { alignSelf: 'center', backgroundColor: '#1a73e8', padding: 8, borderRadius: 8, marginBottom: 16 },
  langText: { color: '#fff', fontWeight: 'bold' },
  tabs: { flexDirection: 'row', marginBottom: 20, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#1a73e8' },
  tab: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  tabActive: { backgroundColor: '#1a73e8' },
  tabText: { fontWeight: '600', color: '#1a73e8' },
  tabTextActive: { color: '#fff' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  row: { flexDirection: 'row', gap: 8 },
  radio: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  radioActive: { borderColor: '#1a73e8', backgroundColor: '#e3f0ff' },
  radioText: { color: '#666', textTransform: 'capitalize' },
  radioTextActive: { color: '#1a73e8', fontWeight: '700' },
  submitBtn: { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
