/** Положение в мм от центра габарита → доля габарита силуэта (0 слева/снизу, Y вверх). */
export const mmToRelPos = (q: { x: number; y: number }, size: [number, number]) => ({ x: (q.x + size[0] / 2) / size[0], y: (q.y + size[1] / 2) / size[1] })
