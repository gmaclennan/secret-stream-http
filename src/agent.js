import { connect } from 'node:net'

import SecretStream from '@hyperswarm/secret-stream'
import { Agent as UndiciAgent } from 'undici'

import { SecretStreamSocket } from './secret-stream-socket.js'

/**
 * @typedef {object} KeyPair
 * @property {Buffer} publicKey
 * @property {Buffer} secretKey
 */

/**
 * @typedef {Omit<UndiciAgent.Options, 'connect'> & { keyPair?: KeyPair, remotePublicKey?: Buffer }} SecretStreamAgentOptions
 */

const kSecretStreamAgent = Symbol.for('secret-stream-agent')

export class Agent extends UndiciAgent {
	#keyPair
	#remotePublicKey

	static keyPair = SecretStream.keyPair

	/**
	 * @param {SecretStreamAgentOptions} [options]
	 */
	constructor({
		keyPair = Agent.keyPair(),
		remotePublicKey,
		...agentOptions
	} = {}) {
		super({
			...agentOptions,
			connect: (options, callback) => this.#connect(options, callback),
		})
		this.#keyPair = keyPair
		this.#remotePublicKey = remotePublicKey
	}

	/**
	 * @param {any} instance
	 * @override
	 */
	static [Symbol.hasInstance](instance) {
		return instance && instance[kSecretStreamAgent] === true
	}

	[kSecretStreamAgent]() {
		return true
	}

	/** @type {import('undici').buildConnector.connector} */
	#connect({ hostname, port }, callback) {
		let called = false
		const safeCallback = (err, result) => {
			if (called) return
			called = true
			callback(err, result)
		}

		const socket = connect({ host: hostname, port: port ? +port : 80 })

		const onConnectError = (err) => {
			socket.destroy()
			safeCallback(err, null)
		}

		socket.once('error', onConnectError)

		socket.once('connect', () => {
			socket.removeListener('error', onConnectError)

			const secretStream = new SecretStream(true, socket, {
				keyPair: this.#keyPair,
			})
			const secretSocket = new SecretStreamSocket(secretStream)

			const cleanup = () => {
				secretStream.removeListener('open', onOpen)
				secretStream.removeListener('error', onError)
				socket.removeListener('error', onSocketError)
			}

			const onOpen = () => {
				cleanup()
				if (!secretStream.remotePublicKey) {
					secretStream.destroy()
					safeCallback(new Error('Remote public key is missing'), null)
				} else if (
					this.#remotePublicKey &&
					!this.#remotePublicKey.equals(secretStream.remotePublicKey)
				) {
					secretStream.destroy()
					safeCallback(
						new Error('Remote public key does not match expected key'),
						null,
					)
				} else {
					// @ts-expect-error - not a socket, but close enough
					safeCallback(null, secretSocket)
				}
			}

			const onError = (err) => {
				cleanup()
				secretStream.destroy()
				safeCallback(err, null)
			}

			const onSocketError = (err) => {
				cleanup()
				secretStream.destroy()
				safeCallback(err, null)
			}

			secretStream.once('open', onOpen)
			secretStream.once('error', onError)
			socket.once('error', onSocketError)
		})
	}
}
