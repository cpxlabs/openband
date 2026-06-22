import { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import type { MasteringVersion } from '../lib/masteringSuite';

interface MasteringVersionManagerProps {
  versions: MasteringVersion[];
  activeVersionId: string | null;
  bypassed: boolean;
  onSaveVersion: (name: string, notes: string) => void;
  onLoadVersion: (id: string) => void;
  onDeleteVersion: (id: string) => void;
  onToggleBypass: () => void;
}

export function MasteringVersionManager({
  versions,
  activeVersionId,
  bypassed,
  onSaveVersion,
  onLoadVersion,
  onDeleteVersion,
  onToggleBypass,
}: MasteringVersionManagerProps) {
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const activeVersion = versions.find(v => v.id === activeVersionId);

  const handleSave = () => {
    if (!newName.trim()) return;
    onSaveVersion(newName.trim(), newNotes.trim());
    setNewName('');
    setNewNotes('');
    setShowSave(false);
  };

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Versões</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={onToggleBypass}
            className={`px-2.5 py-1 rounded-lg border ${bypassed ? 'bg-yellow-500/20 border-yellow-500/40' : 'bg-dark-surface border-dark-border'}`}
          >
            <Text className={`text-[10px] font-bold ${bypassed ? 'text-yellow-400' : 'text-gray-400'}`}>
              {bypassed ? 'BYPASS' : 'A/B'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowSave(!showSave)}
            className="px-2.5 py-1 rounded-lg bg-brand-accent/20 border border-brand-accent/30 active:opacity-70"
          >
            <Text className="text-brand-accent text-[10px] font-bold">+ Salvar</Text>
          </Pressable>
        </View>
      </View>

      {showSave && (
        <View className="bg-dark-surface rounded-xl border border-dark-border p-3 mb-2">
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Nome da versão (ex: Master V1)"
            placeholderTextColor="#666"
            className="input-field px-3 py-2 mb-2 text-xs"
          />
          <TextInput
            value={newNotes}
            onChangeText={setNewNotes}
            placeholder="Notas de recall (o que mudou?)"
            placeholderTextColor="#666"
            multiline
            numberOfLines={2}
            className="input-field px-3 py-2 mb-2 text-xs"
            style={{ minHeight: 40, textAlignVertical: 'top' }}
          />
          <View className="flex-row gap-2">
            <Pressable onPress={() => setShowSave(false)} className="flex-1 py-2 rounded-lg bg-dark-muted items-center active:opacity-70">
              <Text className="text-gray-400 text-xs font-medium">Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleSave} className="flex-1 py-2 rounded-lg bg-brand-accent items-center active:opacity-70">
              <Text className="text-white text-xs font-bold">Salvar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {versions.length === 0 ? (
        <View className="bg-dark-surface/50 rounded-xl border border-dark-border/50 p-4 items-center">
          <Text className="text-gray-600 text-xs">Nenhuma versão salva</Text>
          <Text className="text-gray-700 text-[10px] mt-1">Ajuste os plugins e salve sua primeira versão</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {versions.map(v => {
              const isActive = v.id === activeVersionId;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => onLoadVersion(v.id)}
                  className={`px-3 py-2.5 rounded-xl border ${isActive ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-dark-surface border-dark-border'}`}
                >
                  <Text className={`text-xs font-bold ${isActive ? 'text-cyan-400' : 'text-white'}`}>
                    {v.name}
                  </Text>
                  <Text className="text-[9px] text-gray-500 mt-0.5">
                    {new Date(v.created).toLocaleDateString()}
                  </Text>
                  {v.notes ? (
                    <Text className="text-[9px] text-gray-400 mt-0.5 max-w-[120px]" numberOfLines={2}>
                      {v.notes}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => onDeleteVersion(v.id)}
                    className="mt-1 self-start"
                  >
                    <Text className="text-red-400 text-[8px] font-medium">Excluir</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {activeVersion?.notes && !showSave && (
        <View className="mt-2 bg-dark-surface/50 rounded-lg border border-dark-border/30 p-2">
          <Text className="text-gray-500 text-[9px] font-medium uppercase">Recall Notes</Text>
          <Text className="text-gray-300 text-[11px] mt-0.5">{activeVersion.notes}</Text>
        </View>
      )}
    </View>
  );
}
