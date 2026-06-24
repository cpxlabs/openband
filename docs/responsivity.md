# Responsividade

## Breakpoints

Todas as dimensões vêm do hook `useResponsive` em `src/lib/responsive.ts`, que
envolve `useWindowDimensions` do React Native.

| Breakpoint | Largura     | isMobile | isTablet | isDesktop |
| ---------- | ----------- | -------- | -------- | --------- |
| mobile     | < 480px     | true     | false    | false     |
| tablet     | 480–1023px  | false    | true     | false     |
| desktop    | ≥ 1024px    | false    | false    | true      |

Desktop layout só é ativado em web (`breakpoint === 'desktop' && isWeb`).

## API do Hook

```ts
const resp = useResponsive();
// resp.width, resp.height
// resp.breakpoint         — 'mobile' | 'tablet' | 'desktop'
// resp.isMobile / isTablet / isDesktop
// resp.isLandscape        — width > height
// resp.isWeb              — Platform.OS === 'web'
// resp.sidebarWidth       — 0 / 0 / 64
// resp.contentPadding     — 12 / 20 / 32
// resp.channelWidth       — 96 / 112 / 136
// resp.tracksSidebarWidth — 100 / 144 / 180
// resp.toolbarFontSize    — 10 / 12 / 14
```

## Padrões de Layout

### 1. Padding + Centralização (telas de conteúdo)

Todas as telas de conteúdo (Feed, Biblioteca, Momentos, Extractor, Conta,
Ajustes) seguem o mesmo padrão:

```tsx
<View className={`flex-1 bg-dark-bg ${resp.isMobile ? 'pt-4 px-4' : 'pt-12 px-6'}`}>
  {/* conteúdo com largura máxima no desktop */}
  <ScrollView style={resp.isDesktop ? { maxWidth: 768, alignSelf: 'center', width: '100%' } : undefined}>
    ...
  </ScrollView>
</View>
```

**Larguras máximas usadas:**

| Tela         | Max-width |
| ------------ | --------- |
| Feed         | 768px     |
| Biblioteca   | 768px     |
| Momentos     | 768px     |
| Extractor    | 768px     |
| Conta        | 576px     |
| Ajustes      | 576px     |
| Login        | 448px     |

### 2. Tab Navigator + Sidebar (`app/(tabs)/_layout.tsx`)

- **Desktop (web ≥ 1024px):** Sidebar persistente (224px à esquerda), tab bar
  oculto, sem hamburger.
- **Mobile/Tablet:** Tab bar visível (65px mobile, 72px tablet), hamburger no
  topo abre Sidebar como overlay com backdrop.
- O Sidebar tem `w-56` (224px) no modo persistente, `w-64` (256px) no overlay.

### 3. Studio / DAW (`app/studio/[id].tsx`)

- Toolbar: `h-10` mobile, `h-12` desktop.
- Faixas: altura `resp.isDesktop ? 104 : 80`, largura `resp.channelWidth`.
- Painel FX: metade da largura no desktop, largura total no mobile.
- Mixer: `resp.contentPadding` nas laterais.

Use `resp.tracksSidebarWidth` para a sidebar de tracks e `resp.channelWidth`
para a largura de cada canal.

## Estilização

O app usa **Tailwind v3 com NativeWind**. Todo o CSS responsivo é feito via JS
runtime — não há media queries no `global.css` e não há custom breakpoints no
`tailwind.config.js`.

### Padrões de código

**Pattern 1 — Template literal com ternário (mais comum):**
```tsx
className={`${resp.isMobile ? 'px-4' : resp.isDesktop ? 'max-w-xl mx-auto w-full px-0' : 'px-6'}`}
```

**Pattern 2 — Inline style condicional (desktop centering):**
```tsx
style={resp.isDesktop ? { maxWidth: 768, alignSelf: 'center', width: '100%' } : undefined}
```

**Pattern 3 — Boolean toggle para mobile vs resto:**
```tsx
className={`${resp.isMobile ? 'px-4' : 'px-6'}`}
```

**Pattern 4 — Valores numéricos do hook:**
```tsx
style={{ height: resp.isDesktop ? 104 : 80 }}
```

## Diferenças Web vs Native

`Platform.OS` é usado diretamente (não via `useResponsive`) em:

- `midiSynth.ts`, `Sampler.tsx`, `Synth.tsx`, `MasteringSuite.tsx` —
  `AudioContext` só existe na web.
- `supabase.ts` — sessionStorage na web, SecureStore no native.
- `projectStore.ts` — localStorage na web, OpenBandNative bridge no native.
- `keyboard.ts` — atalhos de teclado só na web.
- `BounceDialog.tsx` — `renderMixdown` usa Web Audio API, pula no native.
- `SampleBrowser.tsx` — caminhos de arquivo locais só na web.
- `app/_layout.tsx` — service worker só na web.

## Inconsistências Conhecidas

1. **Desktop = web-only.** Um iPad Pro em landscape (1024px+) não recebe o
   layout desktop (sidebar persistente + tab bar oculto).
2. **`sm:px-4` em `studio/[id].tsx:975`** usa o breakpoint default do Tailwind
   (640px), que não coincide com nenhum breakpoint do app (480/1024). Prefira
   `resp.isMobile` para consistência.
3. **Max-width variations:** 448px (login), 576px (conta/ajustes), 768px
   (feed/library/momentos/extractor). Sem constante compartilhada.
4. **Nenhum teste de responsividade em componentes.** O arquivo
   `tests/responsive.test.ts` testa apenas os valores do hook, não o layout
   resultante.

## Regras

- Sempre use `useResponsive` para breakpoints. Não use `useWindowDimensions`
  diretamente.
- Não use prefixos `sm:`/`md:`/`lg:` do Tailwind — eles não batem com os
  breakpoints do app.
- Não adicione media queries no CSS. Toda responsividade deve ser runtime.
- Match the breakpoint pattern (mobile < 480, tablet 480–1023, desktop ≥ 1024).
