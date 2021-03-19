import Rollbar from 'rollbar'

export interface ErrorClient extends Rollbar {}

export interface ErrorClientConfiguration {
  accessToken: string
  environment: string
  version: string
}

/**
 * Used to identify the shape of the user within the error client
 */
export interface LoggableUser {
  userId: string
}
