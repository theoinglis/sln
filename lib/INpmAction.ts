
export interface INmpAction {
    run(action: string): Promise<any>;
    install(): Promise<any>;
    link(): Promise<any>;
    unlink(): Promise<any>;
    test(): Promise<any>;
    version(type: string): Promise<any>;
    publish(): Promise<any>;
}