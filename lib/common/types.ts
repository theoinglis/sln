

export class Predicate<T> {
    constructor(private _predicate: ((item: T) => boolean)) {}
    public check(item: T): boolean { return this._predicate(item); }
}
