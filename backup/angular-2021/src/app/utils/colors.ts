import { getRandomInt } from './utils';

export const COLORS: string[] = [
  '#1abc9c',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#16a085',
  '#27ae60',
  '#2980b9',
  '#8e44ad',
  '#f1c40f',
  '#e67e22',
  '#e74c3c',
  '#f39c12',
  '#d35400',
  '#c0392b'
];

export const getRandomColors = (): string => {
  return COLORS[getRandomInt(0, COLORS.length - 1)];
}
