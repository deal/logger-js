import Rollbar from 'rollbar'

export interface LoggerClient extends Rollbar {}

export interface LoggerClientConfiguration {
  accessToken: string
  environment: string
  version: string | undefined
  disabled: boolean | undefined
}

/**
 * Used to identify the shape of the user within the error client
 */
export interface LoggableUser {
  id: string
}
