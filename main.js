#!/usr/bin/env node

const archiver = require('archiver')
const commandLineArgs = require('command-line-args')
const fs = require('fs')
const path = require('path')
const po2json = require('po2json')


class OutputWriter {
    constructor(output) {
        output = output || 'locale'

        if (path.isAbsolute(output)) {
            this.outputPath = output
        } else {
            this.outputPath = path.join(process.cwd(), output)
        }
    }

    async init() { }

    async addFile(content, name) { }

    async finalize() { }

    async _mkdirp(dirPath) {
        var dirname = path.dirname(dirPath);

        if (!fs.existsSync(dirname)) {
            await this._mkdirp(dirname);
        }

        if (!fs.existsSync(dirPath)) {
            await fs.promises.mkdir(dirPath)
        }
    }
}

class FolderOuptutWriter extends OutputWriter {
    async init() {
        await this._mkdirp(this.outputPath)
    }

    async addFile(content, name) {
        const filePath = path.join(this.outputPath, name)
        await this._mkdirp(path.dirname(filePath))
        await fs.promises.writeFile(filePath, content, 'utf8')
    }
}

class ZipOutputWriter extends OutputWriter {
    async init() {
        await this._mkdirp(path.dirname(this.outputPath))
        this.output = fs.createWriteStream(this.outputPath)
        this.archive = archiver('zip')
        this.archive.pipe(this.output)
    }

    async addFile(content, name) {
        this.archive.append(Buffer.from(content), { name })
    }

    async finalize() {
        this.archive.finalize()
    }
}


async function main() {
    try {
        const optionDefinitions = [
            { name: 'src', type: String, defaultOption: true },
            { name: 'out', type: String, alias: 'o' },
            { name: 'zip', type: Boolean, alias: 'z' }
        ]
        const options = commandLineArgs(optionDefinitions)

        // initialize output
        const outputClass = options.zip ? ZipOutputWriter : FolderOuptutWriter
        const output = new outputClass(options.out)
        await output.init()

        // locale source files
        const localeFolder = options.src
        const poFilePath = path.join(localeFolder, 'locale.po')
        const jsonFilePath = path.join(localeFolder, 'locale.json')
        const readmeFilePath = path.join(localeFolder, 'README.md')

        // convert PO file to JSON and add it to the zip file
        const poFileText = await fs.promises.readFile(poFilePath, { encoding: 'utf8' })
        const jsonData = po2json.parse(poFileText, { format: 'jed' })
        await output.addFile(JSON.stringify(jsonData), 'locale/translation.json')

        // load locale metadata and readme
        const localeJsonText = await fs.promises.readFile(jsonFilePath, { encoding: 'utf8' })
        const localeJson = JSON.parse(localeJsonText)
        const readmeText = await fs.promises.readFile(readmeFilePath, { encoding: 'utf8' })

        // add extra metadata to locale JSON
        localeJson['id'] = `${localeJson['organizationId']}:${localeJson['localeId']}:${localeJson['version']}`
        localeJson['readme'] = readmeText
        localeJson['createdAt'] = new Date().toISOString()

        // add locale JSON to the zip file
        await output.addFile(JSON.stringify(localeJson), 'locale/locale.json')

        // finalize the zip archive
        await output.finalize()
    } catch (err) {
        console.error(err)
    }
}

main()
