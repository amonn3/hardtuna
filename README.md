# HardTuna

Afinador de violão web (React + TypeScript + Vite) para afinação padrão **E A D G B E**.

## Rodando

```bash
npm install
npm run dev
```

Abra http://localhost:5173 e clique em **Ativar microfone**.

## Como funciona

- **Captura**: `getUserMedia` com `echoCancellation`, `noiseSuppression` e `autoGainControl` desligados
  (esses filtros de chamada de voz distorcem a afinação), seguido de filtros passa-alta 50 Hz e passa-baixa 1.4 kHz.
- **Detecção de pitch**: McLeod Pitch Method (`src/audio/pitchDetector.ts`) — NSDF via autocorrelação por FFT,
  seleção do primeiro pico-chave ≥ 90% do maior pico (evita erros de oitava) e interpolação parabólica
  para precisão abaixo de 1 cent. Janela de 4096 amostras (~85 ms).
- **Estabilização**: noise gate por RMS, limiar de clareza, mediana das últimas 5 leituras, troca de nota
  só após 3 leituras consistentes e suavização exponencial em escala logarítmica (`src/audio/useTuner.ts`).
- **Ponteiro**: SVG estilo velocímetro (±50 cents) animado por uma mola amortecida (`src/components/Gauge.tsx`).
  Afinado = ±3 cents.

## Recursos

- Detecção automática da corda ou modo manual (clique numa corda para travá-la)
- Indicação "aperte" / "afrouxe" a corda
- Marcação ✓ das cordas já afinadas
- Referência A4 ajustável (430–450 Hz)
