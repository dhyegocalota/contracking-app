import {
  FIVE_ONE_ONE_DURATION_THRESHOLD_SECONDS,
  FIVE_ONE_ONE_INTERVAL_THRESHOLD_SECONDS,
  FIVE_ONE_ONE_MIN_CONTRACTIONS,
  FIVE_ONE_ONE_WINDOW_SECONDS,
  REGULARITY_MAX_STANDARD_DEVIATION_SECONDS,
  REGULARITY_MIN_CONTRACTIONS,
  STATS_SAMPLE_SIZE,
} from './constants';
import { EventType } from './enums';
import type { Contraction, Event, SessionStats } from './types';

function toSeconds(milliseconds: number): number {
  return milliseconds / 1000;
}

function finishedSortedAsc(contractions: Contraction[]): Contraction[] {
  return contractions
    .filter((contraction) => contraction.endedAt !== null)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}

function computeIntervals(contractions: Contraction[]): number[] {
  return contractions
    .slice(1)
    .map((contraction, index) => toSeconds(contraction.startedAt.getTime() - contractions[index]!.startedAt.getTime()));
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateRegularity(contractions: Contraction[]): 'regular' | 'irregular' | null {
  const finished = finishedSortedAsc(contractions);

  if (finished.length < REGULARITY_MIN_CONTRACTIONS) return null;

  const lastSix = finished.slice(-6);
  const intervals = computeIntervals(lastSix);
  const stddev = standardDeviation(intervals);

  return stddev < REGULARITY_MAX_STANDARD_DEVIATION_SECONDS ? 'regular' : 'irregular';
}

export function detectFiveOneOneAlert(contractions: Contraction[]): boolean {
  const finished = finishedSortedAsc(contractions);

  if (finished.length < FIVE_ONE_ONE_MIN_CONTRACTIONS) return false;

  const lastFive = finished.slice(-5);
  const intervals = computeIntervals(lastFive);
  const avgInterval = average(intervals);
  const avgDuration = average(
    lastFive.map((contraction) => toSeconds(contraction.endedAt!.getTime() - contraction.startedAt.getTime())),
  );
  const windowElapsed = toSeconds(Date.now() - lastFive[0]!.startedAt.getTime());

  const intervalMet = avgInterval <= FIVE_ONE_ONE_INTERVAL_THRESHOLD_SECONDS;
  const durationMet = avgDuration >= FIVE_ONE_ONE_DURATION_THRESHOLD_SECONDS;
  const windowMet = windowElapsed >= FIVE_ONE_ONE_WINDOW_SECONDS;

  return intervalMet && durationMet && windowMet;
}

export function calculateSessionStats({
  contractions,
  events,
}: {
  contractions: Contraction[];
  events: Event[];
}): SessionStats {
  const finished = finishedSortedAsc(contractions);
  const sample = finished.slice(-STATS_SAMPLE_SIZE);

  const averageDuration =
    sample.length === 0
      ? 0
      : average(
          sample.map((contraction) => toSeconds(contraction.endedAt!.getTime() - contraction.startedAt.getTime())),
        );

  const sampleIntervals = computeIntervals(sample);
  const averageInterval = sampleIntervals.length === 0 ? 0 : average(sampleIntervals);

  const dilationEvents = events
    .filter((event) => event.type === EventType.DILATION)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const lastDilation = dilationEvents.length > 0 ? dilationEvents[dilationEvents.length - 1]!.value : null;

  return {
    totalContractions: finished.length,
    averageDuration,
    averageInterval,
    regularity: calculateRegularity(contractions),
    alertFiveOneOne: detectFiveOneOneAlert(contractions),
    lastDilation,
  };
}
