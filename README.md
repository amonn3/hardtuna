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
- **Detecção de pitch**: McLeod Pitch Method (`src/audio/pitchDetector.ts`), NSDF por FFT e interpolação parabólica.
  A seleção de picos e o contexto da corda manual/leitura recente reduzem erros de oitava quando há evidência
  no sinal. Não há garantia de eliminar esses erros em instrumentos reais. Janela de 4096 amostras (~85 ms a 48 kHz).
- **Estabilização**: análise limitada a 20 Hz, mediana em janela de 160 ms, confirmação de troca por 100 ms
  e suavização logarítmica com constante de 100 ms (`src/audio/stabilizer.ts`).
  A leitura anterior permanece até 1,2 s com aparência atenuada; somente uma observação aceita é sinal válido.
- **Ponteiro**: SVG com mola amortecida, que interrompe a animação ao estabilizar e respeita movimento reduzido.
  A tolerância compartilhada é ±3 cents. A marcação da corda exige 700 ms de leituras válidas consecutivas.
- **Microfone**: inicializações canceladas liberam recursos, interrupções permitem reconexão e ocultar a aba
  encerra a captura. Cada ativação começa uma sessão nova, sem marcações anteriores.

## Recursos

- Detecção automática da corda ou modo manual (clique numa corda para travá-la)
- Indicação "aperte" / "afrouxe" a corda
- Marcação ✓ das cordas já afinadas
- Referência A4 ajustável (430–450 Hz)

- Sensibilidade ajustável e A4 salvos localmente, quando o navegador permite
- Calibração de ruído: um segundo em silêncio ao ativar, com ação para recalibrar
- Diagnóstico de sinal fraco, pouco periódico ou saturado
- Reinício das marcações sem desligar o microfone
- Modo automático com margem de troca e confirmação de 150 ms; frequências a mais de 300 cents
  de todas as cordas exigem seleção manual
- Controles com estado acessível, foco contido na tela de ativação e suporte a movimento reduzido

## Verificação local

```bash
npm test
npm run benchmark
npm run build
npm run dev
```

A suíte cobre as seis cordas com desvios de ±20 cents, decaimento, silêncio, ruído determinístico,
harmônicos dominantes, notas de oitavas reais, limites de frequência e amostragem de 44,1/48/96 kHz.
Também cobre estabilização, confirmação temporal, escolha da corda, preferências e falhas/cancelamentos da captura.
O erro ficou abaixo de um cent nos sinais sintéticos testados; isso não comprova precisão com microfone real.

O benchmark mede apenas o detector em Node, após aquecimento: cerca de 0,32–0,36 ms por detecção
neste ambiente. Não representa celular nem atraso total. A janela de captura tem 42,7–92,9 ms,
a análise espera até aproximadamente 50 ms, e mediana, confirmação de troca e mola acrescentam atraso.
A latência completa deve ser medida com dispositivo e instrumento reais.

Para testar no navegador:

1. Ative o microfone e aguarde um segundo em silêncio. Toque cada corda em Auto e Manual.
2. Confira a leitura ao parar o som: não deve continuar confirmando afinação.
3. Sustente uma corda afinada por 700 ms e confira a marcação. Troque A4 ou reinicie e confira a limpeza.
4. Ajuste sensibilidade e A4, recarregue e confira a persistência.
5. Desligue/religue, cancele a permissão e alterne de aba; a captura deve encerrar e permitir reconectar.
6. Navegue por teclado e habilite movimento reduzido. Confira os estados com leitor de tela.

## Rede e uso offline

O aplicativo usa fontes do sistema e processa áudio localmente, sem fontes externas.
O acesso inicial ainda requer o servidor: não há service worker nem instalação offline nesta versão.
Um cache offline foi avaliado e adiado para definir atualização/invalidação dos arquivos antes da implementação.
Microfone remoto requer HTTPS; para desenvolvimento na mesma máquina, use localhost.
