/**
 * 時間を秒に変換
 */
export const toSecond = (hour: string, minute: string, second: string) => {
    return (Number(hour) * 60 * 60) + (Number(minute) * 60) + Number(second);
}

/**
 * 秒を時間（hh:mm:ss）のフォーマットに変換
 */
export const toTimeFormat = (fullSecond: number): string | undefined=> {

    if ((!fullSecond && fullSecond !== 0) || !String(fullSecond).match(/^[\-0-9][0-9]*?$/)) return;

    const paddingZero = (n: number) => {
        return (n < 10) ? '0' + n : n;
    };

    const hour = Math.floor(Math.abs(fullSecond) / 3600);
    const minute = Math.floor(Math.abs(fullSecond) % 3600 / 60);
    const second = Math.floor(Math.abs(fullSecond) % 60);

    const minutePad = paddingZero(minute);
    const secondPad = paddingZero(second);

    return ((fullSecond < 0) ? '-' : '') + hour + ':' + minutePad + ':' + secondPad;
}