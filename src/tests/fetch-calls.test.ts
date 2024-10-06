import { BrowserHttpRequestListener } from '@/browser-http-request-listener'
import { RequestModel, RequestResponseModel, ResponseModel } from '@/models'
import jsonDb from './db.json'

const jsonServerApiEndpoint = 'http://localhost:3000/posts'

describe('BrowserHttpRequestListener', () => {
    afterAll(() => {
        BrowserHttpRequestListener.stop()
        BrowserHttpRequestListener.clearSubscribers()
    })

    it('Should not listen for calls untill start method is called', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await fetch(jsonServerApiEndpoint)
        expect(callback).not.toHaveBeenCalled()

        BrowserHttpRequestListener.start()
        await fetch(jsonServerApiEndpoint)

        expect(callback).toHaveBeenCalledTimes(2)
    })

    it('Should stop listen for calls appropiately when the stop method is called', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)
        BrowserHttpRequestListener.start()

        await fetch(jsonServerApiEndpoint)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()
        const stoped = BrowserHttpRequestListener.stop()
        expect(stoped).toBe(true)

        await fetch(jsonServerApiEndpoint)
        expect(callback).not.toHaveBeenCalled()
    })

    it('Should blocks the listening state appropiately and prevent stops if there is any blocker', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await fetch(jsonServerApiEndpoint)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()
        const unblock = BrowserHttpRequestListener.blockListeningState()
        const stoped = BrowserHttpRequestListener.stop()
        expect(stoped).toBe(false)

        await fetch(jsonServerApiEndpoint)
        expect(callback).toHaveBeenCalled()

        // cleanup
        unblock()
    })

    it('Should unblocks the listening state appropiately when the unblocker is called', async () => {
        const callback = jest.fn()
        const unblock = BrowserHttpRequestListener.blockListeningState()

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        const stoped = BrowserHttpRequestListener.stop()
        expect(stoped).toBe(false)

        await fetch(jsonServerApiEndpoint)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()

        unblock()
        const stoped2 = BrowserHttpRequestListener.stop()
        expect(stoped2).toBe(true)

        await fetch(jsonServerApiEndpoint)
        expect(callback).not.toHaveBeenCalled()
    })

    it('Should blocks the listening state appropiately and prevent clear all subscribers if there is any blocker', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await fetch(jsonServerApiEndpoint)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()
        const unblock = BrowserHttpRequestListener.blockListeningState()
        const cleaned = BrowserHttpRequestListener.clearSubscribers()
        expect(cleaned).toBe(false)

        await fetch(jsonServerApiEndpoint)
        expect(callback).toHaveBeenCalled()

        // cleanup
        unblock()
    })

    it('Should clean all the subscribers at once when clearSubscribers is called and there is no blocker', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await fetch(jsonServerApiEndpoint)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()
        const cleaned = BrowserHttpRequestListener.clearSubscribers()
        expect(cleaned).toBe(true)

        await fetch(jsonServerApiEndpoint)
        expect(callback).not.toHaveBeenCalled()
    })

    it('Should unsubscribe the beforeSend callbacks appropiately', async () => {
        const callback = jest.fn()
        const callback2 = jest.fn()

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)

        const unsubscribe =
            BrowserHttpRequestListener.beforeSendHttpRequest(callback2)

        await fetch(jsonServerApiEndpoint)

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback2).toHaveBeenCalledTimes(1)

        unsubscribe()

        await fetch(jsonServerApiEndpoint)

        expect(callback).toHaveBeenCalledTimes(2)
        expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('Should calls all the subscribed callbacks before the actual fetch calls', async () => {
        const callbacks = [
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
        ]

        BrowserHttpRequestListener.start()
        callbacks.forEach((cb) => {
            BrowserHttpRequestListener.beforeSendHttpRequest(cb)
        })

        await fetch(jsonServerApiEndpoint, {
            method: 'get',
            headers: {
                Authorization: 'any-auth',
            },
        })

        callbacks.forEach((cb) => {
            expect(cb).toHaveBeenCalledWith({
                method: 'get',
                url: jsonServerApiEndpoint,
                body: undefined,
                headers: {
                    Authorization: 'any-auth',
                },
            } as RequestModel)
        })
    })

    it('Should modifiy the original request appropiately when beforeSend callback returns a new request object', async () => {
        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(() => {
            return {
                url: jsonServerApiEndpoint,
            }
        })

        const res = await fetch('any-url')
        expect(res.url).toBe(jsonServerApiEndpoint)
    })

    it('Should unsubscribe the afterArrives callbacks appropiately', async () => {
        const callback = jest.fn()
        const callback2 = jest.fn()

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        const unsubscribe =
            BrowserHttpRequestListener.onHttpResponseArrives(callback2)

        await fetch(jsonServerApiEndpoint)
        unsubscribe()
        await fetch(jsonServerApiEndpoint)

        expect(callback).toHaveBeenCalledTimes(2)
        expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('Should calls all the subscribed callbacks when response arrives', async () => {
        const callbacks = [
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
        ]

        BrowserHttpRequestListener.start()
        callbacks.forEach((cb) => {
            BrowserHttpRequestListener.onHttpResponseArrives(cb)
        })

        await fetch(jsonServerApiEndpoint)

        callbacks.forEach((cb) => {
            expect(cb).toHaveBeenCalled()
        })
    })

    it('Should calls the subscribed callback with the correct args when response arrives', async () => {
        let response = {} as ResponseModel
        let request = {} as RequestModel

        const callback = jest.fn((args: RequestResponseModel) => {
            response = args.response
            request = args.request
        })

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await fetch(jsonServerApiEndpoint, {
            method: 'get',
            headers: {
                Authorization: 'any-auth',
            },
        })

        expect(response.responseParsed).toEqual(jsonDb.posts)
        expect(response.statusCode).toBe(200)
        expect(response.statusText).toBe('OK')
        expect(request.method).toBe('get')
        expect(request.headers).toEqual({
            Authorization: 'any-auth',
        })
        expect(request.url).toBe(jsonServerApiEndpoint)
    })

    it('Should calls the subscribed callback one time for each request', async () => {
        const beforeCallback = jest.fn()
        const afterCallback = jest.fn()

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(beforeCallback)
        BrowserHttpRequestListener.onHttpResponseArrives(afterCallback)

        const times = 12
        await Promise.all(
            new Array(times).fill('').map(() => fetch(jsonServerApiEndpoint))
        )

        expect(beforeCallback).toHaveBeenCalledTimes(times)
        expect(afterCallback).toHaveBeenCalledTimes(times)
    })

    it('Should returns the response to original fetch consumer even if the callbacks throws', async () => {
        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(() => {
            throw new Error()
        })
        BrowserHttpRequestListener.onHttpResponseArrives(() => {
            throw new Error()
        })

        const response = await fetch(jsonServerApiEndpoint)
        expect(await response.json()).toEqual(jsonDb.posts)
    })
})
