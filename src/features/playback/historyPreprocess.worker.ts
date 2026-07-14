import { computeHistoryStatisticsDTO, preprocessHistoryFrames } from './historyPreprocess';
import type { HistoryPreprocessRequest, HistoryPreprocessResponse } from './historyPreprocessClient';

self.onmessage = ({ data }: MessageEvent<HistoryPreprocessRequest>) => {
  try {
    const response: HistoryPreprocessResponse = data.type === 'preprocess'
      ? { type: 'success', requestId: data.requestId, generation: data.generation, result: preprocessHistoryFrames(data.frames, data.options) }
      : { type: 'statistics-success', requestId: data.requestId, generation: data.generation, result: computeHistoryStatisticsDTO(data.input) };
    self.postMessage(response);
  } catch (error) {
    self.postMessage({ type: 'failure', requestId: data.requestId, generation: data.generation, message: error instanceof Error ? error.message : String(error) } satisfies HistoryPreprocessResponse);
  }
};
