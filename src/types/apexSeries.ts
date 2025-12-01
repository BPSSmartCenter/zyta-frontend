export type AxisSeriesDatum = number | null;

export type AxisSeries = Array<{
  name?: string;
  type?: string;
  color?: string;
  data: AxisSeriesDatum[];
}>;
