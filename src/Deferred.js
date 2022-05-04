export default class extends Promise {
  constructor() {
    let deferredResolve, deferredReject
    super((resolve, reject) => {
      deferredResolve = resolve
      deferredReject = reject
    })
    this.resolve = deferredResolve
    this.reject = deferredReject
  }
}
