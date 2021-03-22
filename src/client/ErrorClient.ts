import Rollbar, { Configuration, LogArgument } from 'rollbar'
import { GraphQLError } from 'graphql'
import { Operation } from '@apollo/client'
import { ErrorResponse } from '@apollo/client/link/error'
import { LoggableUser, ErrorClientConfiguration } from './types'

export default class ErrorClient {
  private _errorClient: Rollbar | undefined
  private _disabled = false
  public errorHandler: Rollbar.ExpressErrorHandler | undefined

  public constructor(props: ErrorClientConfiguration) {
    this._errorClient = new Rollbar({
      captureUncaught: true,
      captureUnhandledRejections: true,
      // With noisy logs, including more than 5 in the telemetry isn't helpful
      maxTelemetryEvents: 5,
      // Application specific configuration
      accessToken: props.accessToken,
      environment: props.environment,
      version: props.version,
    })

    // Expose the error handler as a public property
    this.errorHandler = this._errorClient.errorHandler
  }

  private resetPayload() {
    this.configure({
      payload: {},
    })
  }

  /**
   * Enable the error client
   *
   * @returns
   */
  public disable() {
    if (this._disabled) {
      return
    }

    this._disabled = true
  }

  /**
   * Disable the error client
   *
   * @returns
   */
  public enable() {
    if (!this._disabled) {
      return
    }

    this._disabled = false
  }

  /**
   * Configure the error client (Rollbar specific)
   *
   * @param logArugments Rollbar.Configuration
   * @returns
   */
  public configure(configuration: Configuration) {
    if (this._disabled) {
      return
    }

    this._errorClient?.configure(configuration)
  }

  /**
   * Log an info level event
   *
   * @param logArguments Rollbar.LogArgument
   * @returns
   */
  public logInfo(...logArguments: LogArgument[]) {
    if (this._disabled) {
      return
    }

    this._errorClient?.info(...logArguments)
  }

  /**
   * Log an error level event
   *
   * @param logArguments Rollbar.LogArgument
   * @returns
   */
  public logError(...logArguments: LogArgument[]) {
    if (this._disabled) {
      return
    }

    this._errorClient?.error(...logArguments)
  }

  public captureNetworkError(
    error: NonNullable<ErrorResponse['networkError']>,
    operation: Operation
  ) {
    if (this._disabled) {
      return
    }

    // Identity mismatch errors occur when the Apollo cache has a stale identity compared to
    //   the JWT in the auth cookie. These are expected, to some extent, during various
    //   impersonation flows.
    const isIdentityMismatchError = error.name === 'IdentityMismatchError'

    this.configure({
      payload: {
        // TODO: Set the user? does this override?
        fingerprint: error.name,
        operationName: operation.operationName,
      },
      logLevel: isIdentityMismatchError ? 'warning' : 'error',
    })

    /**
     * Log a generic event since we're defining a custom `logLevel`
     */
    this._errorClient?.log(error)
    console.error(error, operation)

    this.resetPayload()
  }

  public captureGQLError(gqlError: GraphQLError, operation: Operation) {
    if (this._disabled) {
      return
    }

    // GraphQL errors fall into two categories as far as the client is concerned: authorization errors,
    //   and everything else.
    const isAuthError = gqlError.message.includes('Authorization failure')

    // The GraphQLErrors surfaced by `apollo-link-error` do not actually extend the native Error type.
    //   We create a real Error so the error client recognizes it. This also gives us a stack trace although
    //   those aren't particularly useful since the stack will be the same for all GraphQL errors.

    let fingerprint = 'GraphQLError'
    if (isAuthError) {
      fingerprint = 'AuthorizationError'
    } else if (gqlError.extensions?.classification) {
      fingerprint = gqlError.extensions.classification
    }

    this.configure({
      payload: {
        // TODO: Set the user? does this override?
        fingerprint,
        operationName: operation.operationName,
      },
      logLevel: isAuthError ? 'warning' : 'error',
    })

    const err = new Error(`${operation.operationName}: ${gqlError.message}`)

    this.logError(gqlError.message)
    console.error(err, operation)

    this.resetPayload()
  }

  /**
   * This identify method is a specific implementation for the broader `configure` method. We want
   * to enforce a strict contract for the user that we surface back to our error client.
   *
   * @param user LoggableUser
   */
  public identifyUser(user: LoggableUser) {
    if (this._disabled) {
      return
    }

    this._errorClient?.configure({
      payload: {
        user,
      },
    })
  }
}
