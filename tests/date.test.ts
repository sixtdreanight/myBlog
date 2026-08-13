import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getRelativeTime,
  getFormattedDate,
  getDiffInDays,
  getDaysInYear,
} from '../src/utils/date.ts'

test('getRelativeTime returns Chinese relative time strings', () => {
  const now = new Date('2024-06-15T12:00:00')

  assert.equal(getRelativeTime(new Date('2024-06-15T12:00:00'), now), '刚刚')
  assert.equal(getRelativeTime(new Date('2024-06-15T11:30:00'), now), '30 分钟前')
  assert.equal(getRelativeTime(new Date('2024-06-15T10:00:00'), now), '2 小时前')
  assert.equal(getRelativeTime(new Date('2024-06-06T12:00:00'), now), '9 天前')
  assert.equal(getRelativeTime(new Date('2024-06-04T12:00:00'), now), null)
  assert.equal(getRelativeTime(new Date('2024-06-16T12:00:00'), now), null)
})

test('getDaysInYear handles leap years', () => {
  assert.equal(getDaysInYear(new Date('2024-06-15T12:00:00')), 366)
  assert.equal(getDaysInYear(new Date('2023-06-15T12:00:00')), 365)
  assert.equal(getDaysInYear(new Date('1900-06-15T12:00:00')), 365)
  assert.equal(getDaysInYear(new Date('2000-06-15T12:00:00')), 366)
})

test('getFormattedDate formats a date', () => {
  assert.equal(getFormattedDate(new Date('2024-02-29T00:00:00')), '24 年 2 月 29 日 星期四')
})

test('getDiffInDays computes whole days', () => {
  assert.equal(
    getDiffInDays(new Date('2024-06-15T00:00:00'), new Date('2024-06-20T00:00:00')),
    5,
  )
})
