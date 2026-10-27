import { expect, it } from 'vitest'
import { bukaSaluranHub } from './iframe'

it('hub yang tidak memberi tanda siap → null, dan iframe-nya dibuang (fokus review 3)', async () => {
  expect(await bukaSaluranHub('http://sinfodes.localhost:3000', 50)).toBeNull()
  expect(document.body.querySelector('iframe')).toBeNull()
})
