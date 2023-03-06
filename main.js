#!/usr/bin/env node

const archiver = require('archiver')
const fs = require('fs')
const path = require('path')
const po2json = require('po2json')


async function main() {
    try {
        const [, , ...args] = process.argv

        // locae source files
        const localeFolder = args[0]
        const poFilePath = path.join(localeFolder, 'locale.po')
        const jsonFilePath = path.join(localeFolder, 'locale.json')
        const readmeFilePath = path.join(localeFolder, 'README.md')

        // create output zip file
        const output = fs.createWriteStream(path.join(process.cwd(), 'locale.zip'));
        const archive = archiver('zip')
        archive.pipe(output)

        // convert PO file to JSON and add it to the zip file
        const poFileText = await fs.promises.readFile(poFilePath, { encoding: 'utf8' })
        const jsonData = po2json.parse(poFileText, { format: 'jed' })
        archive.append(Buffer.from(JSON.stringify(jsonData)), { name: 'locale/translation.json' })

        // load locale metadata and readme
        const localeJsonText = await fs.promises.readFile(jsonFilePath, { encoding: 'utf8' })
        const localeJson = JSON.parse(localeJsonText)
        const readmeText = await fs.promises.readFile(readmeFilePath, { encoding: 'utf8' })

        // add extra metadata to locale JSON
        localeJson['id'] = `${localeJson['organizationId']}:${localeJson['localeId']}:${localeJson['version']}`
        localeJson['readme'] = readmeText
        localeJson['createdAt'] = new Date().toISOString()

        // add locale JSON to the zip file
        archive.append(Buffer.from(JSON.stringify(localeJson)), { name: 'locale/locale.json' })

        // finalize the zip archive
        archive.finalize()
    } catch (err) {
        console.error(err)
    }
}

main()
