/** 事件卡的行情窗口：事件当日及之前 60 个交易日 + 之后 20 个交易日。数据切片和画布坐标共用这两个数。 */
export const EVENT_BEFORE = 60;
export const EVENT_AFTER = 20;
/** 画布横轴上的点数：before 和 after 首尾相接 */
export const EVENT_POINTS = EVENT_BEFORE + EVENT_AFTER;
