# Arquitetura do HardTuna

O aplicativo é estático: React e TypeScript para interface e regras musicais, Vite para desenvolvimento e build, Web Audio para captura e análise. Não há backend de áudio.

## Captura e sessão

[`CaptureSession`](../src/audio/capture.ts) registra o stream assim que a permissão chega e o contexto assim que é criado. Cada inicialização tem uma geração; uma permissão concedida após cancelamento encerra as tracks sem iniciar a análise. Falhas ao criar ou retomar o contexto liberam recursos, e rejeições de fechamento são tratadas.

[`useTuner`](../src/audio/useTuner.ts) coordena a sessão, observa o encerramento das tracks e a suspensão do contexto. Ocultar a aba encerra a captura. Reativar o microfone inicia uma sessão nova e limpa as marcações.

A captura solicita `echoCancellation`, `noiseSuppression` e `autoGainControl` desligados. O sinal para detecção passa por filtros passa-alta de 50 Hz e passa-baixa de 1,4 kHz. Um analisador separado observa o áudio antes desses filtros para diagnosticar saturação.

## Detecção

[`PitchDetector`](../src/audio/pitchDetector.ts) implementa McLeod Pitch Method: NSDF calculada com autocorrelação por FFT e refinamento por interpolação parabólica. A janela contém 4096 amostras: aproximadamente 92,9 ms a 44,1 kHz, 85,3 ms a 48 kHz ou 42,7 ms a 96 kHz.

O intervalo de busca é de 60 a 1100 Hz. A seleção usa picos próximos do maior valor de periodicidade. O contexto da corda manual ou de uma leitura recente só influencia a escolha quando há ganho de periodicidade no sinal; uma senoide de oitava real não é simplesmente rebaixada à nota esperada. Isso não garante resolução de toda ambiguidade harmônica.

## Qualidade e estabilização

A análise ocorre com intervalo mínimo de 50 ms, independentemente da taxa da tela. Ao ativar, um segundo de amostras define uma mediana do ruído. O gate combina esse ruído com um piso e a sensibilidade escolhida. A clareza mínima aceita é 0,88; saturação é diagnosticada no sinal anterior aos filtros.

[`PitchStabilizer`](../src/audio/stabilizer.ts) usa mediana em uma janela de 160 ms. Uma diferença superior a 60 cents inicia um candidato; ele precisa permanecer consistente por 100 ms. A suavização trabalha em escala logarítmica, com constante de tempo de 100 ms.

A saída separa frequência, confiança, instante da última leitura aceita e validade atual. Silêncio e candidatos rejeitados invalidam a observação atual sem renovar o instante anterior. A frequência anterior permanece por até 1,2 segundo, sem confirmar afinação.

## Regras musicais e interface

[`tuning.ts`](../src/tuning.ts) concentra conversões, a afinação E2 A2 D3 G3 B3 E4 e a tolerância de ±3 cents. A seleção automática rejeita frequências a mais de 300 cents de todas as cordas. Para trocar uma corda já selecionada, exige vantagem de 40 cents e persistência de 150 ms.

A confirmação exige 700 ms de observações válidas consecutivas, com intervalo máximo de 120 ms entre leituras. Perda do sinal, mudança de referência, mudança de modo/corda e reinício interrompem essa confirmação. Alterar A4 ou iniciar/encerrar a captura limpa as marcações; o botão de reinício também as limpa.

[`Gauge`](../src/components/Gauge.tsx) anima uma mola amortecida e cancela o loop ao estabilizar. Sem sinal válido, o ponteiro retorna diretamente ao repouso. A preferência de movimento reduzido também desliga a mola.

A4 e sensibilidade são persistidos em `localStorage` por [`preferences.ts`](../src/preferences.ts). Bloqueios de armazenamento são tolerados. O aplicativo não grava nem transmite áudio; a hospedagem entrega os arquivos estáticos.

## Publicação

O workflow de GitHub Pages valida cada PR e, na `main`, publica somente `dist/`. O build de Pages usa `/hardtuna/`; o build comum continua disponível para hospedagem na raiz. O job de deploy recebe permissões de Pages e identidade OIDC, enquanto o job de build tem somente leitura do repositório.
