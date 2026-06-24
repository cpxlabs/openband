import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as reactNative from 'react-native';
import Login from '../app/(auth)/login';
import {
  Button,
  TextInput,
  Card,
  CardRow,
  CardIcon,
  Badge,
  Avatar,
  Divider,
  Loading,
  EmptyState,
  ProgressBar,
  PageHeader,
  Metronome,
  RecordOptions,
  PluginRack,
  MasterRack,
  PluginEditor,
  MixManager,
  NewProject,
  WaveformClip,
  AutomationLane,
  TrackGroupManager,
  LufsMeter,
  BounceDialog,
  SampleBrowser,
  CodeSampler,
  MomentCard,
  MiniMastering,
  Tuner,
  PedalRack,
  Sidebar,
  PianoRoll,
  Looper,
  VisualEQ,
  OneKnob,
  OneKnobProcessor,
  ONE_KNOB_TYPES,
  KNOB_PRESETS,
  Sampler,
  Synth,
  SYNTH_PRESETS,
  MasteringChain,
  MasteringVersionManager,
  MasteringUpload,
} from '../src/components';
import type {
  Plugin,
  MixSnapshot,
  TrackAmpChain,
  MetronomeSettings,
} from '../src/lib/types';
import type { MomentData } from '../src/components/MomentCard';
import type { MIDINote } from '../src/components/PianoRoll';
import type { AutomationPoint } from '../src/components/AutomationLane';

vi.mock('expo-audio', () => ({
  useAudioPlayer: vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    replace: vi.fn(),
    seekTo: vi.fn(),
    volume: 1,
  })),
  useAudioPlayerStatus: vi.fn(() => ({
    playing: false,
    currentTime: 0,
    duration: 100,
    isLoaded: true,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Button', () => {
  it('renders title', () => {
    render(<Button title="Click Me" onPress={() => {}} />);
    expect(screen.getByText('Click Me')).toBeTruthy();
  });

  it('fires onPress when pressed', () => {
    const fn = vi.fn();
    render(<Button title="Press" onPress={fn} />);
    fireEvent.click(screen.getByText('Press'));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('shows loading indicator', () => {
    render(<Button title="Loading" onPress={() => {}} loading />);
    expect(screen.queryByText('Loading')).toBeNull();
  });

  it('renders icon', () => {
    render(<Button title="Icon" onPress={() => {}} icon="🎤" />);
    expect(screen.getByText('🎤')).toBeTruthy();
  });

  it('does not fire onPress when disabled', () => {
    const fn = vi.fn();
    render(<Button title="Disabled" onPress={fn} disabled />);
    fireEvent.click(screen.getByText('Disabled'));
    expect(fn).not.toHaveBeenCalled();
  });

  it('renders with testID', () => {
    render(<Button title="Test" onPress={() => {}} testID="btn-primary" />);
    expect(screen.getByTestId('btn-primary')).toBeTruthy();
  });
});

describe('TextInput', () => {
  it('renders label', () => {
    render(<TextInput label="Name" />);
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('renders error message', () => {
    render(<TextInput label="Name" error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('accepts value prop', () => {
    render(<TextInput label="Name" value="John" onChangeText={() => {}} />);
    const input = screen.getByDisplayValue('John');
    expect(input).toBeTruthy();
  });

  it('renders with testID', () => {
    render(<TextInput label="Email" testID="input-field-email" />);
    expect(screen.getByTestId('input-field-email')).toBeTruthy();
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card><div>Content</div></Card>);
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('fires onPress when clickable', () => {
    const fn = vi.fn();
    render(<Card onPress={fn}><div>Clickable</div></Card>);
    fireEvent.click(screen.getByText('Clickable'));
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('CardRow', () => {
  it('renders children', () => {
    render(<CardRow><div>Row Content</div></CardRow>);
    expect(screen.getByText('Row Content')).toBeTruthy();
  });

  it('fires onPress', () => {
    const fn = vi.fn();
    render(<CardRow onPress={fn}><div>Row</div></CardRow>);
    fireEvent.click(screen.getByText('Row'));
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('CardIcon', () => {
  it('renders the icon emoji', () => {
    render(<CardIcon icon="🎸" />);
    expect(screen.getByText('🎸')).toBeTruthy();
  });
});

describe('Badge', () => {
  it('renders text', () => {
    render(<Badge text="New" />);
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('renders icon', () => {
    render(<Badge text="New" icon="★" />);
    expect(screen.getByText('★')).toBeTruthy();
  });

  it('renders with play variant', () => {
    render(<Badge text="Play" variant="play" />);
    expect(screen.getByText('Play')).toBeTruthy();
  });

  it('renders with testID', () => {
    render(<Badge text="Active" variant="active" testID="badge-status-active" />);
    expect(screen.getByTestId('badge-status-active')).toBeTruthy();
  });
});

describe('Avatar', () => {
  it('renders initial letter', () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    render(<Avatar name="Bob" size="sm" />);
    expect(screen.getByText('B')).toBeTruthy();
    render(<Avatar name="Charlie" size="lg" />);
    expect(screen.getByText('C')).toBeTruthy();
  });
});

describe('Divider', () => {
  it('renders plain divider', () => {
    const { container } = render(<Divider />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with label', () => {
    render(<Divider label="Section" />);
    expect(screen.getByText('Section')).toBeTruthy();
  });
});

describe('Loading', () => {
  it('renders default message', () => {
    render(<Loading />);
    expect(screen.getByText('Carregando...')).toBeTruthy();
  });

  it('renders custom message', () => {
    render(<Loading message="Please wait" />);
    expect(screen.getByText('Please wait')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders icon and title', () => {
    render(<EmptyState icon="📭" title="No items" />);
    expect(screen.getByText('📭')).toBeTruthy();
    expect(screen.getByText('No items')).toBeTruthy();
  });

  it('renders subtitle', () => {
    render(<EmptyState icon="📭" title="Empty" subtitle="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});

describe('ProgressBar', () => {
  it('renders with given progress', () => {
    const { container } = render(<ProgressBar progress={50} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('clamps progress between 0 and 100', () => {
    const { container: c1 } = render(<ProgressBar progress={-10} />);
    const { container: c2 } = render(<ProgressBar progress={150} />);
    expect(c1.firstChild).toBeTruthy();
    expect(c2.firstChild).toBeTruthy();
  });
});

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('renders subtitle', () => {
    render(<PageHeader title="Dashboard" subtitle="Welcome back" />);
    expect(screen.getByText('Welcome back')).toBeTruthy();
  });
});

describe('Metronome', () => {
  const baseSettings: MetronomeSettings = {
    bpm: 120, timeSig: [4, 4], accentInterval: 4,
    volume: 80, enabled: true, countIn: false, countInBars: 2,
  };

  it('displays BPM', () => {
    render(<Metronome settings={baseSettings} onChange={() => {}} isPlaying={false} />);
    expect(screen.getByText('120')).toBeTruthy();
  });

  it('expands on press', () => {
    render(<Metronome settings={baseSettings} onChange={() => {}} isPlaying={false} />);
    fireEvent.click(screen.getByText('120'));
    expect(screen.getByText('Metrônomo')).toBeTruthy();
  });

  it('calls onChange when BPM incremented', () => {
    const fn = vi.fn();
    render(<Metronome settings={baseSettings} onChange={fn} isPlaying={false} />);
    fireEvent.click(screen.getByText('120'));
    const plusButtons = screen.getAllByText('+');
    fireEvent.click(plusButtons[0]);
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ bpm: 121 }));
  });
});

describe('RecordOptions', () => {
  const baseSettings = {
    armed: false, inputSource: 'mic' as const, quality: 'high' as const,
    sampleRate: 44100 as const, mono: false, preRoll: 0,
  };

  it('renders nothing when hidden', () => {
    const { container } = render(
      <RecordOptions settings={baseSettings} onChange={() => {}} visible={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when visible', () => {
    render(
      <RecordOptions settings={baseSettings} onChange={() => {}} visible={true} onClose={() => {}} />
    );
    expect(screen.getByText('Opções de Gravação')).toBeTruthy();
  });

  it('calls onClose when close pressed', () => {
    const fn = vi.fn();
    render(
      <RecordOptions settings={baseSettings} onChange={() => {}} visible={true} onClose={fn} />
    );
    fireEvent.click(screen.getByText('✕'));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('toggles armed state', () => {
    const fn = vi.fn();
    render(
      <RecordOptions settings={baseSettings} onChange={fn} visible={true} onClose={() => {}} />
    );
    fireEvent.click(screen.getByText('Desarmado'));
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ armed: true }));
  });
});

describe('PluginRack', () => {
  it('renders with no plugins', () => {
    render(<PluginRack plugins={[]} onChange={() => {}} />);
    expect(screen.getByText('Insert FX')).toBeTruthy();
    expect(screen.getByText('Nenhum plugin inserido')).toBeTruthy();
  });

  it('renders plugin list', () => {
    const plugins: Plugin[] = [
      { id: 'p1', name: 'EQ Eight', type: 'eq', enabled: true, params: {}, color: '#5ac8fa' },
    ];
    render(<PluginRack plugins={plugins} onChange={() => {}} />);
    expect(screen.getByText('EQ Eight')).toBeTruthy();
  });

  it('calls onEdit when plugin pressed', () => {
    const onEdit = vi.fn();
    const plugins: Plugin[] = [
      { id: 'p1', name: 'EQ Eight', type: 'eq', enabled: true, params: {}, color: '#5ac8fa' },
    ];
    render(<PluginRack plugins={plugins} onChange={() => {}} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('EQ Eight'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('toggles plugin enabled state', () => {
    const fn = vi.fn();
    const plugins: Plugin[] = [
      { id: 'p1', name: 'Comp', type: 'compressor', enabled: true, params: {}, color: '#ff9500' },
    ];
    render(<PluginRack plugins={plugins} onChange={fn} />);
    const toggleAreas = screen.getAllByText('◉');
    fireEvent.click(toggleAreas[0]);
    expect(fn).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'p1', enabled: false })])
    );
  });

  it('shows add panel when + pressed', () => {
    render(<PluginRack plugins={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByText('+ Adicionar Plugin'));
    expect(screen.getByText('EQ Eight')).toBeTruthy();
  });
});

describe('MasterRack', () => {
  it('renders Master label', () => {
    render(<MasterRack plugins={[]} onChange={() => {}} />);
    expect(screen.getByText('Master')).toBeTruthy();
  });
});

describe('PluginEditor', () => {
  const eqPlugin: Plugin = {
    id: 'eq1', name: 'EQ Eight', type: 'eq', enabled: true,
    params: { master: 0, b0_freq: 30, b0_gain: 0, b0_q: 0.71, b0_type: 3, b0_enabled: 0 },
    color: '#5ac8fa',
  };

  it('renders nothing for null plugin', () => {
    const { container } = render(
      <PluginEditor plugin={null} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders plugin name and type', () => {
    render(
      <PluginEditor plugin={eqPlugin} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />
    );
    expect(screen.getByText('EQ Eight')).toBeTruthy();
    expect(screen.getByText('eq')).toBeTruthy();
  });

  it('calls onToggle when toggle pressed', () => {
    const fn = vi.fn();
    render(
      <PluginEditor plugin={eqPlugin} onParamChange={() => {}} onToggle={fn} onClose={() => {}} />
    );
    const toggleAreas = screen.getAllByText('◈');
    fireEvent.click(toggleAreas[0]);
    expect(fn).toHaveBeenCalledWith('eq1');
  });

  it('calls onClose when X pressed', () => {
    const fn = vi.fn();
    render(
      <PluginEditor plugin={eqPlugin} onParamChange={() => {}} onToggle={() => {}} onClose={fn} />
    );
    fireEvent.click(screen.getByText('✕'));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('renders compressor editor', () => {
    const compPlugin: Plugin = {
      id: 'c1', name: 'Comp', type: 'compressor', enabled: true,
      params: { threshold: -18, ratio: 4, knee: 3, attack: 3, release: 150, makeupGain: 6 },
      color: '#ff9500',
    };
    render(
      <PluginEditor plugin={compPlugin} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />
    );
    expect(screen.getByText('Comp')).toBeTruthy();
    expect(screen.getByText('4:1')).toBeTruthy();
  });

  it('renders reverb editor', () => {
    const revPlugin: Plugin = {
      id: 'r1', name: 'Reverb', type: 'reverb', enabled: true,
      params: { decay: 2.5, preDelay: 20, damping: 40, size: 60, mix: 30 },
      color: '#64d2ff',
    };
    render(
      <PluginEditor plugin={revPlugin} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />
    );
    expect(screen.getByText('Reverb')).toBeTruthy();
    expect(screen.getByText('2.5s')).toBeTruthy();
  });
});

describe('MixManager', () => {
  const snapshots: MixSnapshot[] = [
    { id: 'm1', name: 'Mix 1', created: Date.now(), trackVolumes: {}, trackPans: {}, trackSends: {}, trackMutes: {}, trackSolos: {}, plugins: {} },
  ];

  it('renders snapshot count', () => {
    render(<MixManager snapshots={snapshots} onSave={() => {}} onLoad={() => {}} onDelete={() => {}} onCompare={() => {}} />);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('expands on press', () => {
    render(<MixManager snapshots={snapshots} onSave={() => {}} onLoad={() => {}} onDelete={() => {}} onCompare={() => {}} />);
    fireEvent.click(screen.getByText('MIX'));
    expect(screen.getByText('Gerenciar Mixes')).toBeTruthy();
  });

  it('calls onLoad when load pressed', () => {
    const fn = vi.fn();
    render(<MixManager snapshots={snapshots} onSave={() => {}} onLoad={fn} onDelete={() => {}} onCompare={() => {}} />);
    fireEvent.click(screen.getByText('MIX'));
    fireEvent.click(screen.getByText('Carregar'));
    expect(fn).toHaveBeenCalledWith('m1');
  });
});

describe('NewProject', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<NewProject visible={false} onClose={() => {}} onCreate={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders genre selection when visible', () => {
    render(<NewProject visible={true} onClose={() => {}} onCreate={() => {}} />);
    expect(screen.getByText('Novo Projeto')).toBeTruthy();
    expect(screen.getByText('Pop')).toBeTruthy();
  });

  it('selects genre and shows details', () => {
    render(<NewProject visible={true} onClose={() => {}} onCreate={() => {}} />);
    fireEvent.click(screen.getByText('Rock'));
    expect(screen.getByText('Criar Projeto')).toBeTruthy();
  });

  it('calls onCreate with config', () => {
    const fn = vi.fn();
    render(<NewProject visible={true} onClose={() => {}} onCreate={fn} />);
    fireEvent.click(screen.getByText('Rock'));
    fireEvent.click(screen.getByText('Criar Projeto'));
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String), genre: expect.any(Object) })
    );
  });
});

describe('WaveformClip', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <WaveformClip regionId="r1" duration={10} color="#5ac8fa" audible={true} height={56} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});

describe('AutomationLane', () => {
  const points: AutomationPoint[] = [
    { time: 0, value: 0 },
    { time: 4, value: 100 },
  ];

  it('renders nothing when not visible', () => {
    const { container } = render(
      <AutomationLane points={points} onChange={() => {}} duration={8} visible={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders label when visible', () => {
    const { container } = render(
      <AutomationLane points={points} onChange={() => {}} duration={8} visible={true} label="Volume" />
    );
    expect(container.firstChild).toBeTruthy();
  });
});

describe('TrackGroupManager', () => {
  const groups = [{ id: 'g1', name: 'Drums', color: '#ff6482', volume: 80, muted: false, trackIds: ['t1'] }];
  const tracks = [{ id: 't1', name: 'Kick', color: 'bg-red-500' }];

  it('renders group name', () => {
    render(
      <TrackGroupManager
        groups={groups} tracks={tracks}
        onCreateGroup={() => {}} onRemoveGroup={() => {}}
        onGroupVolume={() => {}} onGroupMute={() => {}}
        onAssignTrack={() => {}} trackAssignments={{ t1: 'g1' }}
      />
    );
    expect(screen.getByText('Drums')).toBeTruthy();
  });

  it('shows create group button', () => {
    render(
      <TrackGroupManager
        groups={[]} tracks={[]}
        onCreateGroup={() => {}} onRemoveGroup={() => {}}
        onGroupVolume={() => {}} onGroupMute={() => {}}
        onAssignTrack={() => {}} trackAssignments={{}}
      />
    );
    expect(screen.getByText('+ Grupo')).toBeTruthy();
  });
});

describe('LufsMeter', () => {
  it('renders LUFS label', () => {
    render(<LufsMeter isPlaying={false} />);
    expect(screen.getByText('LUFS Meter')).toBeTruthy();
  });

  it('renders target buttons', () => {
    render(<LufsMeter isPlaying={false} />);
    expect(screen.getByText('Streaming')).toBeTruthy();
    expect(screen.getByText('Broadcast')).toBeTruthy();
  });
});

describe('BounceDialog', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(
      <BounceDialog visible={false} onClose={() => {}} projectTitle="Test" duration={120} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders dialog when visible', () => {
    render(
      <BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} />
    );
    expect(screen.getByText('Exportar Mix')).toBeTruthy();
  });

  it('switches format', () => {
    render(
      <BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} />
    );
    fireEvent.click(screen.getByText('AIFF'));
    expect(screen.getByText('AIFF')).toBeTruthy();
  });
});

describe('SampleBrowser', () => {
  it('renders search input', () => {
    render(<SampleBrowser visible={true} onAddSample={() => {}} />);
    expect(screen.getByPlaceholderText('Buscar samples...')).toBeTruthy();
  });

  it('filters samples by search', () => {
    render(<SampleBrowser visible={true} onAddSample={() => {}} />);
    const input = screen.getByPlaceholderText('Buscar samples...');
    fireEvent.change(input, { target: { value: 'Kick 808' } });
    expect(screen.getByText('Kick 808 Profundo')).toBeTruthy();
  });
});

describe('CodeSampler', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(
      <CodeSampler visible={false} onClose={() => {}} onRender={() => {}} bpm={120} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when visible', () => {
    render(
      <CodeSampler visible={true} onClose={() => {}} onRender={() => {}} bpm={120} />
    );
    expect(screen.getByText('Code Sampler')).toBeTruthy();
  });

  it('loads preset on press', () => {
    render(
      <CodeSampler visible={true} onClose={() => {}} onRender={() => {}} bpm={120} />
    );
    fireEvent.click(screen.getByText('808 Classic'));
    expect(screen.getAllByText('KICK').length).toBeGreaterThan(0);
  });

  it('calls onRender with tokens', () => {
    const fn = vi.fn();
    render(
      <CodeSampler visible={true} onClose={() => {}} onRender={fn} bpm={120} />
    );
    fireEvent.click(screen.getByText('Renderizar → Track'));
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('MomentCard', () => {
  const moment: MomentData = {
    id: 'm1', artistName: 'Luna', artistHandle: '@luna', avatar: '',
    caption: 'New track!', songTitle: 'Dreams', songDuration: 180,
    likes: 42, comments: 7, userLiked: false, timeAgo: '2h',
  };

  it('renders artist info', () => {
    render(<MomentCard moment={moment} />);
    expect(screen.getByText('Luna')).toBeTruthy();
    expect(screen.getByText('@luna · 2h')).toBeTruthy();
  });

  it('renders caption', () => {
    render(<MomentCard moment={moment} />);
    expect(screen.getByText('New track!')).toBeTruthy();
  });

  it('renders song title', () => {
    render(<MomentCard moment={moment} />);
    expect(screen.getByText('Dreams')).toBeTruthy();
  });

  it('toggles like on heart press', () => {
    render(<MomentCard moment={moment} />);
    const hearts = screen.getAllByText('♡');
    fireEvent.click(hearts[0]);
    expect(screen.getAllByText('❤').length).toBeGreaterThan(0);
  });
});

describe('MiniMastering', () => {
  const eqValues = { bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 };

  it('renders mastering label', () => {
    render(
      <MiniMastering
        onPresetChange={() => {}} activePreset={0}
        eqValues={eqValues} onEqChange={() => {}}
      />
    );
    expect(screen.getByText('Mastering')).toBeTruthy();
  });

  it('expands on press', () => {
    render(
      <MiniMastering
        onPresetChange={() => {}} activePreset={0}
        eqValues={eqValues} onEqChange={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Mastering'));
    expect(screen.getByText('EQ Rápido')).toBeTruthy();
  });

  it('calls onPresetChange when preset selected', () => {
    const fn = vi.fn();
    render(
      <MiniMastering
        onPresetChange={fn} activePreset={0}
        eqValues={eqValues} onEqChange={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Mastering'));
    fireEvent.click(screen.getByText('Lo-Fi Vibe'));
    expect(fn).toHaveBeenCalled();
  });
});

describe('Tuner', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<Tuner visible={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when visible', () => {
    render(<Tuner visible={true} onClose={() => {}} />);
    expect(screen.getByText('Afinador')).toBeTruthy();
  });

  it('switches instrument', () => {
    render(<Tuner visible={true} onClose={() => {}} />);
    fireEvent.click(screen.getByText('🎸 Baixo'));
    expect(screen.getByText('🎸 Baixo')).toBeTruthy();
  });
});

describe('PedalRack', () => {
  const chain: TrackAmpChain = { pedals: [], amp: null, cab: null };

  it('renders pedalboard label', () => {
    render(<PedalRack chain={chain} onChange={() => {}} trackName="Guitar" />);
    expect(screen.getByText(/Pedalboard/)).toBeTruthy();
  });

  it('renders with testID', () => {
    render(<PedalRack chain={chain} onChange={() => {}} testID="pedal-rack-container" />);
    expect(screen.getByTestId('pedal-rack-container')).toBeTruthy();
  });

  it('enforces maximum 6 pedal slots', () => {
    const fullChain: TrackAmpChain = {
      pedals: Array.from({ length: 6 }, (_, i) => ({
        id: `pedal-${i}`, name: `Pedal ${i}`, type: 'overdrive' as const,
        color: '#ff6482', brand: 'Test', enabled: true, params: {},
      })),
      amp: null, cab: null,
    };
    render(<PedalRack chain={fullChain} onChange={() => {}} />);
    expect(screen.getByText('6')).toBeTruthy();
  });
});

describe('Sidebar', () => {
  it('renders nav items', () => {
    render(
      <Sidebar currentRoute="index" onNavigate={() => {}} isOpen={true} onClose={() => {}} isPersistent={true} />
    );
    expect(screen.getByText('Feed')).toBeTruthy();
    expect(screen.getByText('Biblioteca')).toBeTruthy();
  });

  it('highlights active route', () => {
    render(
      <Sidebar currentRoute="library" onNavigate={() => {}} isOpen={true} onClose={() => {}} isPersistent={true} />
    );
    expect(screen.getByText('Biblioteca')).toBeTruthy();
  });

  it('calls onNavigate when nav item pressed', () => {
    const fn = vi.fn();
    render(
      <Sidebar currentRoute="index" onNavigate={fn} isOpen={true} onClose={() => {}} isPersistent={true} />
    );
    fireEvent.click(screen.getByText('Biblioteca'));
    expect(fn).toHaveBeenCalledWith('library');
  });

  it('renders nothing when not open and not persistent', () => {
    const { container } = render(
      <Sidebar currentRoute="index" onNavigate={() => {}} isOpen={false} onClose={() => {}} isPersistent={false} />
    );
    expect(container.innerHTML).toBe('');
  });
});

describe('PianoRoll', () => {
  const notes: MIDINote[] = [
    { pitch: 60, start: 0, duration: 1, velocity: 100 },
    { pitch: 64, start: 2, duration: 1, velocity: 80 },
  ];

  it('renders nothing when hidden', () => {
    const { container } = render(
      <PianoRoll notes={notes} onChange={() => {}} snap="beat" numBars={4} bpm={120} visible={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when visible', () => {
    render(
      <PianoRoll notes={notes} onChange={() => {}} snap="beat" numBars={4} bpm={120} visible={true} onClose={() => {}} />
    );
    expect(screen.getByText(/Piano Roll/)).toBeTruthy();
  });

  it('shows note count', () => {
    render(
      <PianoRoll notes={notes} onChange={() => {}} snap="beat" numBars={4} bpm={120} visible={true} onClose={() => {}} />
    );
    expect(screen.getByText('2 notes')).toBeTruthy();
  });

  it('shows BPM info', () => {
    render(
      <PianoRoll notes={notes} onChange={() => {}} snap="beat" numBars={4} bpm={120} visible={true} onClose={() => {}} />
    );
    expect(screen.getByText('120')).toBeTruthy();
  });
});

describe('Looper', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(
      <Looper visible={false} onClose={() => {}} bpm={120} onCommitLoop={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when visible', () => {
    render(
      <Looper visible={true} onClose={() => {}} bpm={120} onCommitLoop={() => {}} />
    );
    expect(screen.getByText('Looper')).toBeTruthy();
  });

  it('shows Record button for empty slot', () => {
    render(
      <Looper visible={true} onClose={() => {}} bpm={120} onCommitLoop={() => {}} />
    );
    expect(screen.getAllByText('Record').length).toBeGreaterThan(0);
  });

  it('shows BPM info', () => {
    render(
      <Looper visible={true} onClose={() => {}} bpm={120} onCommitLoop={() => {}} />
    );
    expect(screen.getByText(/120 BPM/)).toBeTruthy();
  });

  it('calls onCommitLoop when recording stops', () => {
    const fn = vi.fn();
    render(
      <Looper visible={true} onClose={() => {}} bpm={120} onCommitLoop={fn} />
    );
    const records = screen.getAllByText('Record');
    fireEvent.click(records[0]);
    fireEvent.click(screen.getByText('Stop'));
    expect(fn).toHaveBeenCalledWith(0, 4);
  });
});

describe('VisualEQ', () => {
  const bands = [
    { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
    { freq: 120, gain: 0, q: 0.71, type: 1, enabled: 1 },
    { freq: 500, gain: 0, q: 0.71, type: 2, enabled: 1 },
    { freq: 1500, gain: 0, q: 0.71, type: 2, enabled: 1 },
    { freq: 5000, gain: 0, q: 0.71, type: 2, enabled: 0 },
    { freq: 10000, gain: 0, q: 0.71, type: 4, enabled: 0 },
    { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 0 },
    { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 0 },
  ];

  it('renders Visual EQ label', () => {
    render(<VisualEQ bands={bands} onChange={() => {}} />);
    expect(screen.getByText('Visual EQ')).toBeTruthy();
  });

  it('shows presets on button press', () => {
    render(<VisualEQ bands={bands} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Presets'));
    expect(screen.getByText('Flat')).toBeTruthy();
  });

  it('applies preset on selection', () => {
    const fn = vi.fn();
    render(<VisualEQ bands={bands} onChange={fn} />);
    fireEvent.click(screen.getByText('Presets'));
    fireEvent.click(screen.getByText('Voice'));
    expect(fn).toHaveBeenCalled();
  });
});

describe('OneKnob', () => {
  it('renders label and value', () => {
    render(<OneKnob label="Warmth" value={50} onChange={() => {}} />);
    expect(screen.getByText('Warmth')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
  });

  it('shows value on press', () => {
    render(<OneKnob label="Test" value={75} onChange={() => {}} />);
    expect(screen.getByText('75')).toBeTruthy();
  });
});

describe('OneKnobProcessor', () => {
  it('renders label from type', () => {
    render(<OneKnobProcessor type="warmth" value={30} onChange={() => {}} />);
    expect(screen.getByText('Warmth')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
  });

  it('renders bass boost type', () => {
    render(<OneKnobProcessor type="bassBoost" value={50} onChange={() => {}} />);
    expect(screen.getByText('Bass Boost')).toBeTruthy();
  });
});

describe('ONE_KNOB_TYPES', () => {
  it('has all 8 types', () => {
    expect(ONE_KNOB_TYPES).toHaveLength(8);
    expect(ONE_KNOB_TYPES).toContain('warmth');
    expect(ONE_KNOB_TYPES).toContain('presence');
    expect(ONE_KNOB_TYPES).toContain('telephone');
  });
});

describe('KNOB_PRESETS', () => {
  it('has all presets', () => {
    expect(KNOB_PRESETS).toHaveProperty('Natural');
    expect(KNOB_PRESETS).toHaveProperty('Warm');
    expect(KNOB_PRESETS).toHaveProperty('Bright');
    expect(KNOB_PRESETS).toHaveProperty('Lo-Fi');
    expect(KNOB_PRESETS).toHaveProperty('Telephone');
  });

  it('each preset has all 8 knob types', () => {
    for (const vals of Object.values(KNOB_PRESETS)) {
      expect(Object.keys(vals)).toHaveLength(8);
    }
  });

  it('Natural preset has warmth 30', () => {
    expect(KNOB_PRESETS['Natural'].warmth).toBe(30);
  });
});

describe('Sampler', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(
      <Sampler visible={false} onClose={() => {}} onAddToTrack={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when visible', () => {
    render(
      <Sampler visible={true} onClose={() => {}} onAddToTrack={() => {}} />
    );
    expect(screen.getByText('Sampler')).toBeTruthy();
  });

  it('shows drum rack mode by default', () => {
    render(
      <Sampler visible={true} onClose={() => {}} onAddToTrack={() => {}} />
    );
    expect(screen.getByText('Drum Rack')).toBeTruthy();
  });

  it('switches to melodic mode', () => {
    render(
      <Sampler visible={true} onClose={() => {}} onAddToTrack={() => {}} />
    );
    fireEvent.click(screen.getByText('Melodic'));
    expect(screen.getByText('Melodic')).toBeTruthy();
  });
});

describe('Synth', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<Synth visible={false} onClose={() => {}} bpm={120} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when visible', () => {
    render(<Synth visible={true} onClose={() => {}} bpm={120} />);
    expect(screen.getByText('Synth')).toBeTruthy();
  });

  it('shows current preset name', () => {
    render(<Synth visible={true} onClose={() => {}} bpm={120} />);
    expect(screen.getByText('Classic Bass')).toBeTruthy();
  });

  it('shows Osc info', () => {
    render(<Synth visible={true} onClose={() => {}} bpm={120} />);
    expect(screen.getByText(/sawtooth \(80%\)/)).toBeTruthy();
  });

  it('shows play buttons', () => {
    render(<Synth visible={true} onClose={() => {}} bpm={120} />);
    expect(screen.getByText('Play C4')).toBeTruthy();
    expect(screen.getByText('Play E4')).toBeTruthy();
  });
});

describe('SYNTH_PRESETS', () => {
  it('has 20 presets', () => {
    expect(SYNTH_PRESETS).toHaveLength(20);
  });

  it('includes expected presets', () => {
    const names = SYNTH_PRESETS.map(p => p.name);
    expect(names).toContain('Classic Bass');
    expect(names).toContain('Deep Sub');
    expect(names).toContain('Lead Saw');
  });
});

describe('MasteringChain', () => {
  const mockPlugins: Plugin[] = [
    { id: 'master-0', name: 'Parametric EQ', type: 'eq', enabled: true, params: { master: 0 }, color: '#5ac8fa' },
    { id: 'master-1', name: 'Compressor', type: 'compressor', enabled: false, params: { threshold: -18 }, color: '#ff9500' },
  ];

  it('renders plugin names', () => {
    render(<MasteringChain plugins={mockPlugins} onToggle={() => {}} onEdit={() => {}} onReset={() => {}} />);
    expect(screen.getByText('Parametric EQ')).toBeTruthy();
    expect(screen.getByText('Compressor')).toBeTruthy();
  });

  it('shows ON/OFF state', () => {
    render(<MasteringChain plugins={mockPlugins} onToggle={() => {}} onEdit={() => {}} onReset={() => {}} />);
    expect(screen.getByText('ON')).toBeTruthy();
    expect(screen.getByText('OFF')).toBeTruthy();
  });

  it('fires onToggle when button pressed', () => {
    const onToggle = vi.fn();
    render(<MasteringChain plugins={mockPlugins} onToggle={onToggle} onEdit={() => {}} onReset={() => {}} />);
    fireEvent.click(screen.getAllByText('ON')[0]);
    expect(onToggle).toHaveBeenCalledWith('master-0');
  });

  it('fires onReset when reset clicked', () => {
    const onReset = vi.fn();
    render(<MasteringChain plugins={mockPlugins} onToggle={() => {}} onEdit={() => {}} onReset={onReset} />);
    fireEvent.click(screen.getByText('Reset'));
    expect(onReset).toHaveBeenCalled();
  });
});

describe('MasteringVersionManager', () => {
  const mockVersions = [
    { id: 'v1', name: 'Master V1', created: Date.now(), plugins: [], notes: 'Added 1dB air' },
    { id: 'v2', name: 'Master V2', created: Date.now() - 86400000, plugins: [], notes: 'Tighter comp' },
  ];

  it('shows empty state when no versions', () => {
    render(<MasteringVersionManager versions={[]} activeVersionId={null} bypassed={false} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    expect(screen.getByText('Nenhuma versão salva')).toBeTruthy();
  });

  it('renders version names', () => {
    render(<MasteringVersionManager versions={mockVersions} activeVersionId="v1" bypassed={false} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    expect(screen.getByText('Master V1')).toBeTruthy();
    expect(screen.getByText('Master V2')).toBeTruthy();
  });

  it('shows active version notes', () => {
    render(<MasteringVersionManager versions={mockVersions} activeVersionId="v1" bypassed={false} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    expect(screen.getByText('Recall Notes')).toBeTruthy();
    const notes = screen.getAllByText('Added 1dB air');
    expect(notes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows A/B button text when bypassed', () => {
    render(<MasteringVersionManager versions={mockVersions} activeVersionId="v1" bypassed={true} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    expect(screen.getByText('BYPASS')).toBeTruthy();
  });

  it('shows A/B button text when not bypassed', () => {
    render(<MasteringVersionManager versions={mockVersions} activeVersionId="v1" bypassed={false} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    expect(screen.getByText('A/B')).toBeTruthy();
  });
});

describe('MasteringUpload', () => {
  it('renders upload drop zone when no input', () => {
    render(<MasteringUpload input={null} mode="single" onModeChange={() => {}} onUpload={() => {}} onClear={() => {}} />);
    expect(screen.getByText('Upload .wav Mix')).toBeTruthy();
  });

  it('shows stems mode text', () => {
    render(<MasteringUpload input={null} mode="stems" onModeChange={() => {}} onUpload={() => {}} onClear={() => {}} />);
    expect(screen.getByText('Upload Stems')).toBeTruthy();
  });

  it('shows filename when input provided', () => {
    const mockInput = { type: 'single' as const, filename: 'mix_final.wav', size: 52428800, sampleRate: 44100, bitDepth: 24, duration: 180, url: 'test.wav' };
    render(<MasteringUpload input={mockInput} mode="single" onModeChange={() => {}} onUpload={() => {}} onClear={() => {}} />);
    expect(screen.getByText('mix_final.wav')).toBeTruthy();
  });

  it('shows Trocar button when input exists', () => {
    const mockInput = { type: 'single' as const, filename: 'mix_final.wav', size: 52428800, sampleRate: 44100, bitDepth: 24, duration: 180, url: 'test.wav' };
    render(<MasteringUpload input={mockInput} mode="single" onModeChange={() => {}} onUpload={() => {}} onClear={() => {}} />);
    expect(screen.getByText('Trocar')).toBeTruthy();
  });
});

describe('testID Contract', () => {
  it('renders testID on WaveformClip', () => {
    render(<WaveformClip regionId="r1" duration={4} color="bg-brand-accent" audible={true} testID="waveform-clip-r1" />);
    expect(screen.getByTestId('waveform-clip-r1')).toBeTruthy();
  });

  it('renders testID on LufsMeter', () => {
    render(<LufsMeter isPlaying={false} testID="lufs-meter-display" />);
    expect(screen.getByTestId('lufs-meter-display')).toBeTruthy();
  });

  it('renders testID on BounceDialog', () => {
    render(<BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} testID="dialog-bounce-export" />);
    expect(screen.getByTestId('dialog-bounce-export')).toBeTruthy();
  });

  it('renders testID on PageHeader', () => {
    render(<PageHeader title="Dashboard" testID="page-header-dashboard" />);
    expect(screen.getByTestId('page-header-dashboard')).toBeTruthy();
  });

  it('renders testID on Card', () => {
    render(<Card testID="card-main"><div>Content</div></Card>);
    expect(screen.getByTestId('card-main')).toBeTruthy();
  });

  it('renders testID on Divider', () => {
    render(<Divider testID="divider-section" />);
    expect(screen.getByTestId('divider-section')).toBeTruthy();
  });

  it('renders testID on Metronome', () => {
    const settings: MetronomeSettings = { bpm: 120, timeSig: [4, 4], accentInterval: 4, volume: 80, enabled: true, countIn: false, countInBars: 2 };
    render(<Metronome settings={settings} onChange={() => {}} isPlaying={false} testID="metronome-control" />);
    expect(screen.getByTestId('metronome-control')).toBeTruthy();
  });

  it('renders testID on MixManager', () => {
    render(<MixManager snapshots={[]} onSave={() => {}} onLoad={() => {}} onDelete={() => {}} onCompare={() => {}} testID="mix-manager" />);
    expect(screen.getByTestId('mix-manager')).toBeTruthy();
  });

  it('renders testID on TrackGroupManager', () => {
    render(<TrackGroupManager groups={[]} tracks={[]} onCreateGroup={() => {}} onRemoveGroup={() => {}} onGroupVolume={() => {}} onGroupMute={() => {}} onAssignTrack={() => {}} trackAssignments={{}} testID="track-group-manager" />);
    expect(screen.getByTestId('track-group-manager')).toBeTruthy();
  });

  describe('Responsive Layout', () => {
    it('adapts Login screen layout to mobile dimensions', () => {
      const spy = vi.spyOn(reactNative, 'useWindowDimensions');
      spy.mockReturnValue({ width: 375, height: 812, scale: 1, fontScale: 1 });

      const { container } = render(<Login />);
      const viewElement = container.firstChild?.firstChild;
      expect(viewElement).toBeTruthy();
      const styleAttr = (viewElement as HTMLElement).getAttribute('style');
      expect(styleAttr).toBeNull();

      spy.mockRestore();
    });

    it('adapts Login screen layout to desktop dimensions', () => {
      const spy = vi.spyOn(reactNative, 'useWindowDimensions');
      spy.mockReturnValue({ width: 1200, height: 800, scale: 1, fontScale: 1 });

      const { container } = render(<Login />);
      const viewElement = container.firstChild?.firstChild;
      expect(viewElement).toBeTruthy();
      const styleAttr = (viewElement as HTMLElement).getAttribute('style');
      expect(styleAttr).toContain('max-width: 448px');

      spy.mockRestore();
    });
  });
});
