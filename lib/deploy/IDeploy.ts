
export interface IDeploy {
    deploy(appName: string, fromBranch?: string): Promise<any>
}