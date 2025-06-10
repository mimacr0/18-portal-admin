// Simple EventBus implementation
class EventBus {
  constructor() {
    this.subscribers = {};
  }

  on(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.subscribers[event]) return;
    this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
  }

  trigger(event, payload) {
    if (!this.subscribers[event]) return;
    this.subscribers[event].forEach(callback => callback(payload));
  }
}

// Browser utility
const browser = {
  fetch: window.fetch.bind(window),
};

export const rpcBus = new EventBus();

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------
export class RPCError extends Error {
    constructor() {
        super(...arguments);
        this.name = "RPC_ERROR";
        this.type = "server";
        this.code = null;
        this.data = null;
        this.exceptionName = null;
        this.subType = null;
    }
}

export class ConnectionLostError extends Error {
    constructor(url, ...args) {
        super(`Connection to "${url}" couldn't be established or was interrupted`, ...args);
        this.url = url;
    }
}

export class ConnectionAbortedError extends Error {}

export function makeErrorFromResponse(reponse) {
    const { code, data: errorData, message, type: subType } = reponse;
    const error = new RPCError();
    error.exceptionName = errorData.name;
    error.subType = subType;
    error.data = errorData;
    error.message = message;
    error.code = code;
    return error;
}

// -----------------------------------------------------------------------------
// Main RPC method
// -----------------------------------------------------------------------------
let rpcId = 0;
export function rpc(url, params = {}, settings = {}) {
    return rpc._rpc(url, params, settings);
}

// such that it can be overriden in tests
rpc._rpc = function (url, params, settings) {
    const data = {
        id: rpcId++,
        jsonrpc: "2.0",
        method: "call",
        params: params,
    };

    const controller = new AbortController();
    const { signal } = controller;

    rpcBus.trigger("RPC:REQUEST", { data, url, settings });

    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(settings.headers || {})
        },
        body: JSON.stringify(data),
        signal
    };

    let rejectFn;
    const promise = new Promise((resolve, reject) => {
        rejectFn = reject;

        browser.fetch(url, fetchOptions)
            .then(response => {
                if (response.status === 502) {
                    const error = new ConnectionLostError(url);
                    rpcBus.trigger("RPC:RESPONSE", { data, settings, error });
                    throw error;
                }
                return response.json().catch(() => {
                    const error = new ConnectionLostError(url);
                    rpcBus.trigger("RPC:RESPONSE", { data, settings, error });
                    throw error;
                });
            })
            .then(params => {
                const { error: responseError, result: responseResult } = params;
                if (!params.error) {
                    rpcBus.trigger("RPC:RESPONSE", { data, settings, result: params.result });
                    resolve(responseResult);
                    return;
                }

                const error = makeErrorFromResponse(responseError);
                error.id = data.id;
                error.model = data.params.model;
                rpcBus.trigger("RPC:RESPONSE", { data, settings, error });
                reject(error);
            })
            .catch(error => {
                if (error instanceof RPCError || error instanceof ConnectionLostError) {
                    reject(error);
                } else if (error.name === 'AbortError') {
                    const abortError = new ConnectionAbortedError("Fetch request aborted");
                    rpcBus.trigger("RPC:RESPONSE", { data, settings, error: abortError });
                    reject(abortError);
                } else {
                    const connectionError = new ConnectionLostError(url);
                    rpcBus.trigger("RPC:RESPONSE", { data, settings, error: connectionError });
                    reject(connectionError);
                }
            });
    });

    promise.abort = function (rejectError = true) {
        controller.abort();
        if (!rejectError) {
            // Do nothing, the promise will be rejected by the AbortError in the catch handler
        }
    };

    return promise;
};
