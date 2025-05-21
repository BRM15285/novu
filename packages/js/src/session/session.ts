import { NovuEventEmitter } from '../event-emitter';
import { InitializeSessionArgs } from './types';
import type { InboxService } from '../api';

export class Session {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;
  #options: InitializeSessionArgs;

  constructor(
    options: InitializeSessionArgs,
    inboxServiceInstance: InboxService,
    eventEmitterInstance: NovuEventEmitter
  ) {
    this.#emitter = eventEmitterInstance;
    this.#inboxService = inboxServiceInstance;
    this.#options = options;
  }

  public get applicationIdentifier() {
    return this.#options.applicationIdentifier;
  }

  public get subscriberId() {
    return this.#options.subscriber.subscriberId;
  }

  public async initialize(): Promise<void> {
    if (this.#options.jwt) {
      // 1. Emitimos el evento de pending
      this.#emitter.emit('session.initialize.pending', { args: this.#options });

      // 2. Establecemos el token en el HttpClient de InboxService
      this.#inboxService.setAuthorizationToken(this.#options.jwt);

      // 3. Marcamos la sesión como inicializada
      this.#inboxService.isSessionInitialized = true;

      // 4. Emitimos el evento de resolved como si todo hubiera ido bien
      this.#emitter.emit('session.initialize.resolved', {
        args: this.#options,
        data: {
          token: this.#options.jwt,
          totalUnreadCount: 0,
          removeNovuBranding: false,
          isDevelopmentMode: false,
          maxSnoozeDurationHours: 24,
        },
      });

      // 5. No hacemos nada más, ya que el token JWT se ha establecido correctamente
      return;
    }

    try {
      const { applicationIdentifier, subscriberHash, subscriber } = this.#options;
      this.#emitter.emit('session.initialize.pending', { args: this.#options });

      const response = await this.#inboxService.initializeSession({
        applicationIdentifier,
        subscriberHash,
        subscriber,
      });

      this.#emitter.emit('session.initialize.resolved', { args: this.#options, data: response });
    } catch (error) {
      this.#emitter.emit('session.initialize.resolved', { args: this.#options, error });
    }
  }
}
