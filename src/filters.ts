import fetch from 'node-fetch'
import {
	ContactPaginatedList,
	HealthElementDto,
	InvoiceDto,
	InvoicePaginatedList,
	PatientPaginatedList,
	ServiceDto,
	ServicePaginatedList,
	UserDto
} from 'icc-api'
import { forEachDeep, mapDeep } from './reduceDeep'
import { flatMap, pick, get, isObject } from 'lodash'
import * as Peg from 'pegjs'
import { Api } from './api'
import { format, fromUnixTime, getUnixTime, addMonths, parse, addYears } from 'date-fns'

import * as colors from 'colors/safe'
import { Args, CommandInstance } from 'vorpal'

require('node-json-color-stringify')

const fs = require('fs')
const vorpal = new (require('vorpal'))()

// TODO use a logger
// TODO patient merges
// TODO & -> | -> -
// TODO bundle pkg and send it

const tmp = require('os').tmpdir()
console.log('Tmp dir: ' + tmp)
;(global as any).localStorage = new (require('node-localstorage').LocalStorage)(tmp, 5 * 1024 * 1024 * 1024)
;(global as any).Storage = ''

const options = {
	username: 'abdemo',
	password: 'knalou',
	host: 'https://backendb.svc.icure.cloud/rest/v1'
}

let api = new Api(options.host, { Authorization: `Basic ${Buffer.from(`${options.username}:${options.password}`).toString('base64')}` }, fetch as any)
let hcpartyId: string = ''

api.hcpartyicc.getCurrentHealthcareParty().then(hcp => {
	hcpartyId = hcp.id
	if (hcp.id === '782f1bcd-9f3f-408a-af1b-cd9f3f908a98') {
		const privateKey = '308204bd020100300d06092a864886f70d0101010500048204a7308204a302010002820101009ad2f63357da7bb9b67b235b50f66c4968b391ba3340c4c4a697d0495512bff35f3692ffdcc867fa0602819d9fe9353f049b6c69e2dbf4a987e4d1b88b9475307c41427b33af8c0a6779a8347122f032cb801b54e2ce54e2edef2b1ae1f440a797945a4d0ab541711866ea32d096fe2da943bdd8251345fd8f50b0481e88f52e326a2cc9446d125c9643650182dbebf0272da6004a954acc21f8f47236fa7d3bbb256fb932aceb9b0fe081af27a3b476d0885905526b0e5faaa7d712536b77b05ff29a36b617a17ef611b8876346cc9ff864a295cc9ec2d5fe0efb0d94d99e5db96ea36a96d95ec63de639d243c74c773a4c350236265f71260de0fcd5fbb94b02030100010282010100878dd589b68dd06e155b52e58cc9749e0151d77193964db16fbad3dea0e1bdb633d2f0799cb0ca7899f26fd1b644d51dcbc6d8f10c73508f6e2fe57f129674d472b620a305e9d94ef2b20d977cc6fe4f3ae57b08a35bcbeeb42c072d8e4ff09bcb975448c7eb52d4d66ca4f8c0b0b2f2ff94140fbec6552d5fe161b683259ea3e95278ac83826f0674a4b0b5b6c717087abce79c73c9f6bf7832ef7337d8b07912244c30e3dc59512b8d2ab0fec288d8e561e29985e7eaaaa1e010a52ed025f5fa201c893214a42d9b17eff87752902063a1accc4eb169cd408aec4ee95e588e0bf5fccb6e945e67b965c6fb5d936c1b8cbf5e6dd6f7a9b8b4dd25f68ffcb68102818100ddc101d385681b81f527edb6dce5cb7ca9e2e7cb28fa1187933628bfbc38e9c153cd3783453a7e0ffbd2ad28ef67e879e08744d7148e83b3cb3fb7282ac03feed5d44cb7e70d014b1aef213d0c057d3d6c75653739ee22ba794c0a5f6194db84c6df3e0dddbdf57b1cc114881015f49c26eda572470dc708d2a1abc4c541671b02818100b2bbe5ab2f5d41323c8c9a6b65daf0771f416abc6c8c6b08a2bcd632e6ebba0d9efb6d99b435a3ae5b1b2b3ef450648e361bc6c480902d25b459ad120c05286ab7f91e24ecc8516ba9db086e8dabf5bb4ba97ef1c4c20a751841e472a41132145623eca0ca4fbb3025b4fb7430e0e5258afedb5017c2a0dd66cb8bcf0d172991028180345bc8049b71335d81f70587b1ac88594cfb88634daf8dc807183892dcec4b351c864ddf2ecf5ac8875afd0bb74b3f76d76ed8f037a856ac7306fe45fba21cf65582a5029f09510edcb32d93ee6cb55f75665a99a991f29d38da9d705be7fbd4e3e7fe0ce4186007cb884342c5198a01fca70bf3699775313e1a722629b5019502818006e5ab5234ccb3745dd3cb2db3cb841604b5c089aee2a84ab804f37b19602558db36b69f04ce4117bc5a4b0beddfa051c092c7d3d3663ce7c492e553d9f4e4ff614412beb8086ee3e9b51319390c56ba388c3ce2d585eb6363613f9090f63ce97dfd7ae725877820be83c264547289452e9cf117a123189412a06e2fba40979102818070faf47286b59425cb7c2f617f2b7b1b280b932f131a86b82e63c4fb240525ab40323ab902c507a4aee337f9f95b89aa9151d1ae2882bff497396e680407f5407ca154f20047017022eda8fe0438a473fb38123d36bc51bffc69e3c13fab4ecf16057529265e2c0993ca8886cc019c65e9460fe549b553fa48bb0f3ca0975e78'
		api.cryptoicc.loadKeyPairsAsTextInBrowserLocalStorage(hcpartyId, api.cryptoicc.utils.hex2ua(privateKey))
			.catch(error => {
				console.error('Error: in loadKeyPairsAsTextInBrowserLocalStorage')
				console.error(error)
			})
	}
})

vorpal
	.command('login <username> <password> [host]', 'Login to iCure')
	.action(async function(this: CommandInstance, args: Args) {
		options.username = args.username
		options.password = args.password
		args.host && (options.host = args.host)

		api = new Api(options.host, { Authorization: `Basic ${Buffer.from(`${options.username}:${options.password}`).toString('base64')}` }, fetch as any)
	})

vorpal
	.command('pki <hcpId> <key>', 'Private Key Import')
	.action(async function(this: CommandInstance, args: Args) {
		const hcpId = args.hcpId
		const key = args.key

		await api.cryptoicc.loadKeyPairsAsTextInBrowserLocalStorage(hcpId, api.cryptoicc.utils.hex2ua(key))
		if (await api.cryptoicc.checkPrivateKeyValidity(await api.hcpartyicc.getHealthcareParty(hcpId))) {
			this.log('Key is valid')
		} else {
			this.log('Key is invalid')
		}
	})

vorpal
	.command('lpkis', 'List Private Keys')
	.action(async function(this: CommandInstance, args: Args) {
		const users = (await api.usericc.listUsers(undefined, undefined, undefined)).rows
		users.reduce(async (p: Promise<any>, u: UserDto) => {
			await p
			if (u.healthcarePartyId) {
				const hcp = await api.hcpartyicc.getHealthcareParty(u.healthcarePartyId)
				try {
					if (hcp.publicKey && await api.cryptoicc.checkPrivateKeyValidity(hcp)) {
						this.log(`${colors.green('√')} ${hcp.id}: ${hcp.firstName} ${hcp.lastName}`)
					} else {
						this.log(`${colors.red('X')} ${hcp.id}: ${hcp.firstName} ${hcp.lastName}`)
					}
				} catch (e) {
					this.log(`X ${hcp.id}: ${hcp.firstName} ${hcp.lastName}`)
				}
			}
		}, Promise.resolve())
	})

function convertVariable(text: string): number | string {
	if (text.endsWith('m')) {
		return Number(format(addMonths(new Date(), -Number(text.substr(0, text.length - 1))), 'yyyyMMdd'))
	} else if (text.endsWith('y')) {
		return Number(format(addYears(new Date(), -Number(text.substr(0, text.length - 1))), 'yyyyMMdd'))
	}
	return text
}

vorpal
	.command('query [input...]', 'Queries iCure')
	.action(async function(this: CommandInstance, args: Args) {
		try {
			const start = +new Date()
			const hcp = await api.hcpartyicc.getCurrentHealthcareParty()
			if (!hcp) {
				console.error('You are not logged in')
				return
			}
			const input = args.input.join(' ')
			this.log('Parsing query: ' + input)
			let parsedInput
			try {
				parsedInput = parser.parse(input, { hcpId: hcp.parentId || hcp.id })
			} catch (e) {
				e.location && e.location.start.column && this.log(' '.repeat(e.location.start.column + 14) + colors.red('↑'))
				this.log(colors.red(`Cannot parse : ${e.location !== undefined
					? 'Line ' + e.location.start.line + ', column ' + e.location.start.column + ': ' + e.message
					: e.message}`))
				return
			}
			console.log('Filter pre-rewriting: ' + JSON.stringify(parsedInput))

			const vars: {[index: string]: any} = {}
			forEachDeep(parsedInput,(obj, parent, idx) => {
				if (isObject(obj) && (obj as any).variable && (obj as any).variable.startsWith && (obj as any).variable.startsWith('$')) {
					vars[(obj as any).variable.substr(1)] = ''
				}
			})

			await Object.keys(vars).reduce(async (p,v) => {
				await p
				vars[v] = convertVariable((await this.prompt({ type: 'input', 'message': `${v} : `, 'name': 'value' })).value)
			} , Promise.resolve())

			const output = await rewriteFilter(
				mapDeep(parsedInput,(obj) => (isObject(obj) && (obj as any).variable && (obj as any).variable.startsWith && (obj as any).variable.startsWith('$')) ? vars[(obj as any).variable.substr(1)] : obj)
				, true, '', '')
			const finalResult = await handleFinalRequest(output)
			this.log((JSON as any).colorStringify(finalResult.rows, null, '\t'))
			const stop = +new Date()
			this.log(`${finalResult.rows.length} items returned in ${stop - start} ms`)
		} catch (e) {
			console.error('Unexpected error', e)
		}
	})

vorpal
	.command('whoami', 'Logged user info')
	.action(async function(this: CommandInstance, args: Args) {
		this.log((await api.usericc.getCurrentUser()).login + '@' + options.host)
	})

vorpal
	.command('ex', 'Example queries')
	.action(async function(this: CommandInstance, args: Args) {
		this.log('PAT[age<25y]')
		this.log('PAT[(age>45y & SVC[ICPC == T89 & :CD-ITEM == diagnosis]) - SVC[LOINC == Hba1c & :CD-ITEM == diagnosis]]')
		this.log('PAT[age>25y & age<65y - SVC[CISP == X75{19000101 -> 20200101} & :CD-ITEM == diagnosis] - SVC[CISP == X37.002] - SVC[CISP == X37.003]]')
		this.log('PAT[age>25y & age<65y - (SVC[CISP == X75{<3y} & :CD-ITEM == diagnosis] | HE[CISP == X75 | HE[CISP == X75]]) - SVC[CISP == X37.002] - SVC[CISP == X37.003]]')
		this.log('PAT[age>45y & SVC[ICPC == T89{>1m} & :CD-ITEM == diagnosis | ICPC == T90] - SVC[ICPC == T90]]')
	})

vorpal
	.delimiter('icure-reporting$')
	.history('icrprt')
	.show()

const grammar = fs.readFileSync('./pegjs', 'utf8')
const parser = Peg.generate(grammar)

const debug = false

const requestToFilterTypeMap = {
	'SVC': 'ServiceByHcPartyTagCodeDateFilter',
	'HE': 'HealthElementByHcPartyTagCodeFilter',
	'INV': 'InvoiceByHcPartyCodeDateFilter'
}

type Reducer = { reducer: 'count' | 'sum' | 'min' | 'max' | 'mean' | 'd2s' | 'd2y' | 's2d' | 'select', params: Array<string> }
const reducers = {
	'count': (params?: Array<string>) => (acc?: any, x?: any) => acc === undefined ? [0] : [acc[0] + 1],
	'sum': (params?: Array<string>) => (acc?: any, x?: any) => {
		const val = (params && params[0] ? get(x, params[0]) : x)
		return acc === undefined ? [0] : [acc[0] + val]
	},
	'mean': (params?: Array<string>) => (acc?: any, x?: any, idx?: number) => {
		const val = (params && params[0] ? get(x, params[0]) : x)
		return acc === undefined ? [0] : [acc[0] + (val - acc[0]) / ((idx || 0) + 1)]
	},
	'min': (params?: Array<string>) => (acc?: any, x?: any, idx?: number) => {
		const val = (params && params[0] ? get(x, params[0]) : x)
		return acc === undefined ? [999999999999] : [val < acc[0] ? val : acc[0]]
	},
	'max': (params?: Array<string>) => (acc?: any, x?: any, idx?: number) => {
		const val = (params && params[0] ? get(x, params[0]) : x)
		return acc === undefined ? [-999999999999] : [val > acc[0] ? val : acc[0]]
	},
	's2d': (params?: Array<string>) => (acc?: any, x?: any, idx?: number) => {
		const val = (params && params[0] ? get(x, params[0]) : x)
		const d = val && Number(format(fromUnixTime(val), 'yyyyMMdd'))
		return acc === undefined ? [] : acc.concat([d])
	},
	'd2s': (params?: Array<string>) => (acc?: any, x?: any, idx?: number) => {
		const val = (params && params[0] ? get(x, params[0]) : x)
		const d = val && getUnixTime(parse(val.toString(), 'yyyyMMdd', 0)) || 0
		return acc === undefined ? [] : acc.concat([d])
	},
	'd2y': (params?: Array<string>) => (acc?: any, x?: any, idx?: number) => {
		const val = (params && params[0] ? get(x, params[0]) : x)
		const d = val && getUnixTime(parse(val.toString(), 'yyyyMMdd', 0)) || 0
		return acc === undefined ? [] : acc.concat([(+new Date() / 1000 - d) / (365.25 * 24 * 3600)])
	},
	'select': (params?: Array<string>) => (acc?: any, x?: any, idx?: number) => acc === undefined ? [] : acc.concat([params ? pick(x, params) : x])
}

const converters = {
	'SVC': (filter: any) => Object.assign({},
		pick(filter, ['healthcarePartyId']),
		{ $type: requestToFilterTypeMap['SVC'] },
		{
			codeType: filter.key,
			codeCode: filter.value,
			tagType: filter.colonKey,
			tagCode: filter.colonValue,
			startValueDate: (filter.startDate && filter.startDate.length <= 8) ? filter.startDate + '000000' : filter.startDate,
			endValueDate: (filter.endDate && filter.endDate.length <= 8) ? filter.endDate + '000000' : filter.startDate
		}),
	'HE': (filter: any) => Object.assign({},
		pick(filter, ['healthcarePartyId']),
		{ $type: requestToFilterTypeMap['HE'] },
		{ codeType: filter.key, codeNumber: filter.value, tagType: filter.colonKey, tagCode: filter.colonValue }),
	'INV': (filter: any) => Object.assign({},
		pick(filter, ['healthcarePartyId']),
		{ $type: requestToFilterTypeMap['INV'] },
		{ code: filter.value, startInvoiceDate: filter.startDate, endInvoiceDate: filter.endDate })
}

async function rewriteFilter(filter: any, first: boolean, mainEntity: string, subEntity: string): Promise<any> {
	try {
		if (debug) console.error('Rewriting ' + JSON.stringify(filter))
		if (filter.$type === 'request' && first && filter.entity && filter.filter) {
			return {
				$type: 'request',
				entity: filter.entity,
				filter: await rewriteFilter(filter.filter, false, filter.entity, subEntity),
				reducers: filter.reducers
			}
		} else if (filter.$type === 'request') {
			if (filter.entity === 'SUBTRACT') {
				if (debug) console.log('Subtract')
				const left = await rewriteFilter(filter.left, first, mainEntity, subEntity)
				const right = await rewriteFilter(filter.right, first, mainEntity, subEntity)
				return { $type: 'ComplementFilter', superSet: left, subSet: right }
			}
			const rewritten = await rewriteFilter(filter.filter, first, mainEntity, filter.entity || subEntity)
			const body = { filter: rewritten }
			try {
				if (filter.entity === 'SVC') {
					if (debug) console.error('Request SVC: ' + JSON.stringify(body))
					const servicesOutput = await api.contacticc.filterServicesBy(undefined, undefined, undefined, body) // TODO here and elsewhere or any
					if (mainEntity === 'PAT') {
						const patientIds: string[] = await servicesToPatientIds(servicesOutput)
						return { $type: 'PatientByIdsFilter', ids: patientIds }
					}
				} else if (filter.entity === 'HE') {
					if (debug) console.log('Request HE: ' + JSON.stringify(body))
					const helementOutput = await api.helementicc.filterBy(body)
					if (mainEntity === 'PAT') {
						const patientIds: string[] = await helementsToPatientIds(helementOutput)
						return { $type: 'PatientByIdsFilter', ids: patientIds }
					}
				} else if (filter.entity === 'INV') {
					console.error('Request INV: ' + JSON.stringify(body))
					const invoiceOutput = await api.invoiceicc.filterBy(body)
					if (mainEntity === 'PAT') {
						const patientIds: string[] = await invoicesToPatientIds(invoiceOutput)
						return { $type: 'PatientByIdsFilter', ids: patientIds }
					}
				}
			} catch (error) {
				console.error('Error occurred while handling entity ' + filter.entity + ' with body: ' + JSON.stringify(body))
				console.error(error)
				return Promise.reject()
			}
			console.error('Filter not supported yet: ' + filter)
			return Promise.reject()
		} else if (filter.$type !== 'request') {
			if (filter.filters) {
				let target = JSON.parse(JSON.stringify(filter))
				target.filters = await Promise.all(filter.filters.map(async (f: any) => rewriteFilter(f, first, mainEntity, subEntity)))
				return target
			} else if (filter.subSet || filter.superSet) {
				let target = JSON.parse(JSON.stringify(filter))
				if (filter.subSet) target.subSet = await rewriteFilter(target.subSet, first, mainEntity, subEntity)
				if (filter.superSet) target.superSet = await rewriteFilter(target.superSet, first, mainEntity, subEntity)
				return target
			} else { // TODO maybe other conditions here
				if (filter.$type === 'PLACEHOLDER') {
					// @ts-ignore
					const newFilter = converters[subEntity](filter)
					if (debug) console.log('Leaf filter: ' + JSON.stringify(filter))
					return newFilter
				}
				if (debug) console.error('Leaf filter: ' + JSON.stringify(filter))
				return filter
			}
		} else { // never hits this
			console.error('Failed to parse filter: ' + JSON.stringify(filter))
			return Promise.reject()
		}
	} catch (error) {
		console.error('Error occurred while rewriting filter: ' + JSON.stringify(filter))
		console.error(error)
		return Promise.reject()
	}
}

async function handleFinalRequest(filter: any): Promise<any> {
	if (filter.$type === 'request' && filter.entity && filter.filter) {
		let res: PatientPaginatedList | InvoicePaginatedList | ContactPaginatedList | ServicePaginatedList
		if (filter.entity === 'PAT') {
			res = await api.patienticc.filterByWithUser(await api.usericc.getCurrentUser(), undefined, undefined, undefined, undefined, undefined, undefined, { filter: filter.filter })
		} else {
			console.error('Entity not supported yet: ' + filter.entity)
			return Promise.reject()
		}

		if (res && res.rows && res.rows.length) {
			filter.reducers && filter.reducers.forEach((r: Reducer) => {
				const red = reducers[r.reducer] && reducers[r.reducer](r.params)
				if (red) {
					res = Object.assign(res, { rows: (res.rows as Array<any>).reduce(red, red()) })
				}
			})
		}
		return res
	} else {
		console.error('Filter not valid: ' + JSON.stringify(filter, null, ' '))
		return {}
	}
}

async function servicesToPatientIds(servicesOutput: any): Promise<string[]> {
	try {
		const services: ServiceDto[] = servicesOutput.rows
		const extractPromises = services.map((svc: ServiceDto) => api.cryptoicc.extractKeysFromDelegationsForHcpHierarchy(hcpartyId, svc.contactId || '', svc.cryptedForeignKeys || {}))
		return [...new Set(flatMap(await Promise.all(extractPromises), it => it.extractedKeys))] // set to remove duplicates
		// return await patienticc.getPatients({ids: patientIds})
	} catch (error) {
		console.error('Error while converting services to patients')
		console.error(error)
		return Promise.reject()
	}
}

async function helementsToPatientIds(helements: HealthElementDto[]): Promise<string[]> {
	try {
		const extractPromises = helements.map((he: HealthElementDto) => api.cryptoicc.extractKeysFromDelegationsForHcpHierarchy(hcpartyId, he.id || '', he.cryptedForeignKeys || {}))
		return [...new Set(flatMap(await Promise.all(extractPromises), it => it.extractedKeys))] // set to remove duplicates
	} catch (error) {
		console.error('Error while converting health elements to patients')
		console.error(error)
		return Promise.reject()
	}
}

async function invoicesToPatientIds(invoices: InvoiceDto[]): Promise<string[]> {
	try {
		const extractPromises = invoices.map((he: InvoiceDto) => api.cryptoicc.extractKeysFromDelegationsForHcpHierarchy(hcpartyId, he.id || '', he.cryptedForeignKeys || {}))
		return [...new Set(flatMap(await Promise.all(extractPromises), it => it.extractedKeys))] // set to remove duplicates
	} catch (error) {
		console.error('Error while converting health elements to patients')
		console.error(error)
		return Promise.reject()
	}
}
