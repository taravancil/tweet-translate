import test from 'ava'
import {
  addUser,
  removeUser,
  getUserIDByScreenName,
  getScreenNameByID
} from './dist/db'

const SCREEN_NAME = 'testuser'
let UID

test.before(async () => {
  // add a test user
  await addUser(SCREEN_NAME)
  UID = await getUserIDByScreenName(SCREEN_NAME)
})

test.after(async () => {
  // remove the test user from the db
  await removeUser(UID)
})

test('get user ID by screen name', async t => {
  t.is(await getUserIDByScreenName(SCREEN_NAME), UID)
})

test('get non-existent user ID by screen name', async t => {
  t.is(await getUserIDByScreenName('notauser'), null)
})

test('get screen name by user ID', async t => {
  t.is(await getScreenNameByID(UID), SCREEN_NAME)
})

test('get screen name by non-existent user ID', async t => {
  t.is(await getScreenNameByID('notauser'), null)
})
