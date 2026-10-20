import { describe, expect, it } from 'vitest'
import {
  motionPreferenceKey,
  readMotionPreference,
  resolveMotionPreference,
  writeMotionPreference,
} from '@/services/motionPreference'

// WEB-12 — adapter for the local motion preference (docs/web/
// WEB_ACCOUNT_RWD_SPEC.md §4.4, WEB-D12/WEB-D13; AC-WEBSETTINGS-03/04/07/08).
// Expected keys and JSON are written out by hand here, never imported from
// the module, so a change of format fails these tests.

const A = '00000000-0000-4000-8000-0000000012a1'
const B = '00000000-0000-4000-8000-0000000012b2'
const KEY_A = 'novaway:web:motion-preference:00000000-0000-4000-8000-0000000012a1'
const KEY_B = 'novaway:web:motion-preference:00000000-0000-4000-8000-0000000012b2'
const SENTINEL_KEY = 'unrelated.sentinel'
const TOKEN_KEY = 'novaway_web_token'

interface FakeStorage extends Storage {
  calls: string[]
  data: Map<string, string>
  failGet?: () => Error
  failSet?: () => Error
}

function fakeStorage(entries: Record<string, string> = {}): FakeStorage {
  const data = new Map(Object.entries({ [SENTINEL_KEY]: 'keep-me', ...entries }))
  const storage = {
    calls: [] as string[],
    data,
    failGet: undefined as (() => Error) | undefined,
    failSet: undefined as (() => Error) | undefined,
    get length() {
      return data.size
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem(key: string) {
      storage.calls.push(`get ${key}`)
      if (storage.failGet) throw storage.failGet()
      return data.get(key) ?? null
    },
    setItem(key: string, value: string) {
      storage.calls.push(`set ${key}`)
      if (storage.failSet) throw storage.failSet()
      data.set(key, value)
    },
    removeItem(key: string) {
      storage.calls.push(`remove ${key}`)
      data.delete(key)
    },
    clear() {
      storage.calls.push('clear')
      data.clear()
    },
  }
  return storage as FakeStorage
}

const domError = (name: string) => Object.assign(new Error(name), { name })
const getterOf = (storage: Storage) => () => storage

describe('motionPreferenceKey (WEB-D12)', () => {
  it('uses the raw user id after the fixed prefix', () => {
    expect(motionPreferenceKey(A)).toBe(KEY_A)
  })

  it('refuses an empty, non-string or over-long id', () => {
    expect(motionPreferenceKey('')).toBeNull()
    expect(motionPreferenceKey(42 as unknown as string)).toBeNull()
    expect(motionPreferenceKey(undefined as unknown as string)).toBeNull()
    expect(motionPreferenceKey('x'.repeat(129))).toBeNull()
    expect(motionPreferenceKey('x'.repeat(128))).toBe(`novaway:web:motion-preference:${'x'.repeat(128)}`)
  })

  it('an invalid id never reaches storage: read is the default, write is refused', () => {
    const storage = fakeStorage()
    expect(readMotionPreference('', getterOf(storage))).toEqual({ choice: 'system', problem: null })
    expect(writeMotionPreference('', 'reduced', getterOf(storage))).toBe(false)
    expect(storage.calls).toEqual([])
  })
})

describe('readMotionPreference — valid records', () => {
  it('nothing stored → system, no problem', () => {
    expect(readMotionPreference(A, getterOf(fakeStorage()))).toEqual({ choice: 'system', problem: null })
  })

  it('reads reduced and system', () => {
    expect(readMotionPreference(A, getterOf(fakeStorage({ [KEY_A]: '{"version":1,"motion":"reduced"}' })))).toEqual({ choice: 'reduced', problem: null })
    expect(readMotionPreference(A, getterOf(fakeStorage({ [KEY_A]: '{"version":1,"motion":"system"}' })))).toEqual({ choice: 'system', problem: null })
  })

  it('key order does not matter', () => {
    expect(readMotionPreference(A, getterOf(fakeStorage({ [KEY_A]: '{"motion":"reduced","version":1}' })))).toEqual({ choice: 'reduced', problem: null })
  })

  it("A's record is not B's: B reads the default", () => {
    const storage = fakeStorage({ [KEY_A]: '{"version":1,"motion":"reduced"}' })
    expect(readMotionPreference(B, getterOf(storage))).toEqual({ choice: 'system', problem: null })
    expect(storage.calls).toEqual([`get ${KEY_B}`])
  })
})

describe('readMotionPreference — (a) read failures (AC-WEBSETTINGS-04)', () => {
  it('getItem throws → system / read-failed, nothing thrown', () => {
    const storage = fakeStorage({ [KEY_A]: '{"version":1,"motion":"reduced"}' })
    storage.failGet = () => domError('SecurityError')
    expect(readMotionPreference(A, getterOf(storage))).toEqual({ choice: 'system', problem: 'read-failed' })
  })

  it('the storage getter itself throws (localStorage blocked) → system / read-failed', () => {
    const blocked = () => {
      throw domError('SecurityError')
    }
    expect(readMotionPreference(A, blocked)).toEqual({ choice: 'system', problem: 'read-failed' })
  })
})

describe('readMotionPreference — (c) invalid records (AC-WEBSETTINGS-08, U12)', () => {
  const invalid: [string, string][] = [
    ['not JSON', 'not-json'],
    ['JSON null', 'null'],
    ['array', '[]'],
    ['string', '"reduced"'],
    ['number', '42'],
    ['version 2', '{"version":2,"motion":"reduced"}'],
    ['version 0', '{"version":0,"motion":"reduced"}'],
    ['version as string', '{"version":"1","motion":"reduced"}'],
    ['version missing', '{"motion":"reduced"}'],
    ['motion unknown', '{"version":1,"motion":"fast"}'],
    ['motion wrong case', '{"version":1,"motion":"REDUCED"}'],
    ['motion missing', '{"version":1}'],
    ['motion not a string', '{"version":1,"motion":true}'],
    ['extra field (U12)', '{"version":1,"motion":"reduced","x":1}'],
    ['extra field with system (U12)', '{"version":1,"motion":"system","savedAt":"2026-10-21"}'],
  ]
  for (const [name, raw] of invalid) {
    it(`${name} → system / invalid, record left as it was`, () => {
      const storage = fakeStorage({ [KEY_A]: raw })
      expect(readMotionPreference(A, getterOf(storage))).toEqual({ choice: 'system', problem: 'invalid' })
      expect(storage.data.get(KEY_A)).toBe(raw)
      expect(storage.calls).toEqual([`get ${KEY_A}`])
    })
  }

  it('a "__proto__" member is an own extra key after JSON.parse, so invalid', () => {
    const raw = '{"version":1,"motion":"reduced","__proto__":{"x":1}}'
    const storage = fakeStorage({ [KEY_A]: raw })
    expect(readMotionPreference(A, getterOf(storage))).toEqual({ choice: 'system', problem: 'invalid' })
  })
})

describe('writeMotionPreference (WEB-D12)', () => {
  it('writes exactly {version:1, motion} under the account key and nothing else', () => {
    const storage = fakeStorage()
    expect(writeMotionPreference(A, 'reduced', getterOf(storage))).toBe(true)
    expect(storage.calls).toEqual([`set ${KEY_A}`])
    const stored = JSON.parse(storage.data.get(KEY_A)!)
    expect(stored).toEqual({ version: 1, motion: 'reduced' })
    expect(Object.keys(stored).sort()).toEqual(['motion', 'version'])
    expect(storage.data.get(SENTINEL_KEY)).toBe('keep-me')
    expect(storage.data.has(TOKEN_KEY)).toBe(false)
  })

  it('choosing system writes system (no removeItem)', () => {
    const storage = fakeStorage({ [KEY_A]: '{"version":1,"motion":"reduced"}' })
    expect(writeMotionPreference(A, 'system', getterOf(storage))).toBe(true)
    expect(JSON.parse(storage.data.get(KEY_A)!)).toEqual({ version: 1, motion: 'system' })
    expect(storage.calls).toEqual([`set ${KEY_A}`])
  })

  it('a later valid write replaces an invalid record', () => {
    const storage = fakeStorage({ [KEY_A]: '{"version":1,"motion":"reduced","x":1}' })
    expect(readMotionPreference(A, getterOf(storage)).problem).toBe('invalid')
    expect(writeMotionPreference(A, 'reduced', getterOf(storage))).toBe(true)
    expect(readMotionPreference(A, getterOf(storage))).toEqual({ choice: 'reduced', problem: null })
  })

  it('(b) quota exceeded → false, nothing thrown, old value and sentinel kept', () => {
    const storage = fakeStorage({ [KEY_A]: '{"version":1,"motion":"reduced"}' })
    storage.failSet = () => domError('QuotaExceededError')
    expect(writeMotionPreference(A, 'system', getterOf(storage))).toBe(false)
    expect(storage.data.get(KEY_A)).toBe('{"version":1,"motion":"reduced"}')
    expect(storage.data.get(SENTINEL_KEY)).toBe('keep-me')
  })

  it('(b) setItem SecurityError → false', () => {
    const storage = fakeStorage()
    storage.failSet = () => domError('SecurityError')
    expect(writeMotionPreference(A, 'reduced', getterOf(storage))).toBe(false)
  })

  it('(b) storage getter throws → false', () => {
    const blocked = () => {
      throw domError('SecurityError')
    }
    expect(writeMotionPreference(A, 'reduced', blocked)).toBe(false)
  })

  it('rejects a value outside the enum without writing', () => {
    const storage = fakeStorage()
    expect(writeMotionPreference(A, 'fast' as 'reduced', getterOf(storage))).toBe(false)
    expect(storage.calls).toEqual([])
  })

  it('writing for B leaves A untouched', () => {
    const storage = fakeStorage({ [KEY_A]: '{"version":1,"motion":"reduced"}' })
    expect(writeMotionPreference(B, 'system', getterOf(storage))).toBe(true)
    expect(storage.data.get(KEY_A)).toBe('{"version":1,"motion":"reduced"}')
    expect(JSON.parse(storage.data.get(KEY_B)!)).toEqual({ version: 1, motion: 'system' })
  })
})

describe('resolveMotionPreference — the override is the whole state (R12-02)', () => {
  it('no override → the loaded state', () => {
    expect(resolveMotionPreference({ choice: 'system', problem: 'read-failed' }, undefined)).toEqual({ choice: 'system', problem: 'read-failed' })
  })

  it('a successful override clears an old read error (problem:null wins)', () => {
    expect(resolveMotionPreference({ choice: 'system', problem: 'read-failed' }, { choice: 'reduced', problem: null })).toEqual({ choice: 'reduced', problem: null })
  })

  it('a successful override clears an old invalid record', () => {
    expect(resolveMotionPreference({ choice: 'system', problem: 'invalid' }, { choice: 'system', problem: null })).toEqual({ choice: 'system', problem: null })
  })

  it('a failed write keeps the chosen value and reports write-failed', () => {
    expect(resolveMotionPreference({ choice: 'reduced', problem: null }, { choice: 'system', problem: 'write-failed' })).toEqual({ choice: 'system', problem: 'write-failed' })
  })
})
