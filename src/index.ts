import 'dotenv/config'

import { Client } from '@notionhq/client'
import { FROM_DATABASE, SOURCE_DATABASE, TOKEN, TO_DATABASE } from './constants/common'
import { promisify } from 'util'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

const wait = promisify(setTimeout)

const client = new Client({ auth: TOKEN })

const start = async () => {
  const children = await client.databases.query({
    database_id: SOURCE_DATABASE,
    filter: {
      and: [
        {
          property: 'isFetched',
          checkbox: {
            equals: false
          },
        },
        {
          property: 'Группа',
          relation: {
            is_not_empty: true
          }
        }
      ]
    }
  })

  for await (const lesson of children.results as PageObjectResponse[]) {
    const from = lesson.properties['Группа']
    if (
      from.type !== 'relation' ||
      typeof from !== 'object'
    ) return

    const fromObjects = await client.databases.query({
      database_id: FROM_DATABASE,
      filter: {
        property: 'Группа',
        relation: {
          contains: from.relation[0].id
        }
      }
    })
    for await (const child of fromObjects.results) {
      await client.pages.create({
        parent: {
          database_id: TO_DATABASE
        },
        properties: {
          'Ученик': {
            relation: [
              {
                id: child.id
              }
            ]
          },
          'Группа': {
            relation: [
              {
                id: from.relation[0].id
              }
            ]
          },
          'Дата': {
            date: {
              start: new Date().toISOString().split('T')[0]
            }
          }
        }
      })
    }
    await client.pages.update({
      page_id: lesson.id,
      properties: {
        'isFetched': {
          checkbox: true
        }
      }
    })
  }

  await wait(3000)
  start()
}

start()
