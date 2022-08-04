// Adaptation from `gatsby-remark-images`
// https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-remark-images
// with also some refactor

const visitWithParents = require(`unist-util-visit-parents`)
const getDefinitions = require(`mdast-util-definitions`)
const cheerio = require(`cheerio`)
const { extractPublicId } = require(`cloudinary-build-url`)
const { createResolveCloudinaryAssetData } = require(`gatsby-transformer-cloudinary/gatsby-plugin-image/resolve-asset`)

const _escape = require('lodash.escape');

const {
	DEFAULT_OPTIONS,
	EMPTY_ALT,
	imageClass,
	imageBackgroundClass,
	imageWrapperClass
} = require(`gatsby-remark-images/constants`);

module.exports = async ({
	markdownNode,
	markdownAST,
	getNode,
	reporter,
	cache,
	compiler,
	actions: {createNode, createParentChildLink},
	createNodeId,
	createContentDigest,
}, pluginOptions) => {


	const options = Object.assign({}, DEFAULT_OPTIONS, pluginOptions)

	/**
	 * @function resolveCloudinaryAssetData
	 * Generate responsive data from cloudinary image.
	 * @param {Object} source
	 * @param {string} source.cloudName - cloudinary bucket name
	 * @param {string} source.publicId - image public id
	 * @param {number} [source.width] - image width
	 * @param {number} [source.height] - image height
	 * @param {string} [source.format] - image format
	 * @param {string} [source.defaultBase64]
	 * @param {string} [source.defaultTracedSVG]
	 *
	 * @param {Object} args
	 * @param {string} [args.placeholder] - either `blurred` or `tracedSVG`
	 * @param {string} [args.placeholderURL] - default placeholder if args.placeholder is undefined, can be svg and base64
	 * @param {string[]} [args.formats = ['auto', 'webp']] - array of strings in  "jpeg" | "png" | "webp" | "avif" | "auto" | ""
	 * @param {string} [args.layout] - one of "fixed" | "fullWidth" | "constrained"
	 * @param {number} [args.width]
	 * @param {number} [args.height]
	 * @param {string} [args.sizes]
	 * @param {Object} [args.reporter] - need at least `.warn`
	 * @param {string} [args.fit] - one of "cover" | "fill" | "inside" | "outside" | "contain"
	 * @param {number[]} [args.breakpoints]
	 * @param {string} [args.backgroundColor]
	 * @param {number} [args.aspectRatio]
	 * @returns {Object}
	 */
	const resolveCloudinaryAssetData = createResolveCloudinaryAssetData({reporter})

	const isCloudinaryUrl = url => typeof url === "string" && url.indexOf(`res.cloudinary.com/${options.cloudName}/`) >= 0

// 	const getFormat = url => typeof url === "string" &&  url.split('.').pop()

	const findParentLinks = ({ children }) =>
	children.some(
		node =>
		(node.type === `html` && !!node.value.match(/<a /)) ||
		node.type === `link`
	)

	// Get all the available definitions in the markdown tree
	const definitions = getDefinitions(markdownAST)


	const getImageCaption = async (node, overWrites={}) => {
		const getCaptionString = () => {
			const captionOptions = Array.isArray(options.showCaptions) ? options.showCaptions : options.showCaptions === true ? [`title`, `alt`] : false;

			if (captionOptions) {
				for (const option of captionOptions) {
					switch (option) {
						case `title`:
							if (node.title) {
								return node.title;
							}

							break;

						case `alt`:
							if (node.alt === EMPTY_ALT || overWrites.alt === EMPTY_ALT) {
								return ``;
							}

							if (overWrites.alt) {
								return overWrites.alt;
							}

							if (node.alt) {
								return node.alt;
							}

							break;
					}
				}
			}

			return ``;
		};

		const captionString = getCaptionString();

		if (!options.markdownCaptions || !compiler) {
			return _escape(captionString);
		}

		return compiler.generateHTML(await compiler.parseString(captionString));
	};

	// Takes a node and generates the needed images and then returns
	// the needed HTML replacement for the image
	async function generateImagesHtml({url, alt, title}, resolve, inLink) {

		if (!isCloudinaryUrl(url))
			return resolve()


		if (![`lazy`, `eager`, `auto`].includes(options.loading)) {
			reporter.warn(`${options.loading} is an invalid value for the 'loading' option. Please pass one of "lazy", "eager" or "auto".`);
		}

		if (![`async`, `sync`, `auto`].includes(options.decoding)) {
			reporter.warn(`${options.decoding} is an invalid value for the 'decoding' option. Please pass one of "async", "sync" or "auto".`);
		}

		const source = {
			cloudName: options.cloudName,
			publicId: extractPublicId(url),
		}

		const args = {
			reporter,
			backgroundColor: options.backgroundColor,
			layout: 'constrained',
		}

		const extraArgs = Object.fromEntries( Object.entries(options).filter( item => ['breakpoints', 'formats', 'placeholder', 'aspectRatio', 'sizes', 'fit', 'width', 'height', 'placeholderURL'].includes(item[0])) )


		Object.assign(args, extraArgs)

		if (options.disableBgImage) {
			delete args.placeholder
			delete args.placeholderURL
		}

		const imageData = await resolveCloudinaryAssetData(source, args)


		const defaultAlt = source.publicId;
		const isEmptyAlt = alt === EMPTY_ALT;
		alt = isEmptyAlt ? `` : _escape(alt ? alt : defaultAlt);
		title = title ? _escape(title) : alt;


		const sources = imageData.images.sources.map( ({srcSet, sizes, type}) => `
			<source
				type="${type}"
				sizes="${sizes}"
				srcset="${srcSet}"
			>
		`).join('')


		const image = `
			<picture>
				${sources}
				<img
					class="${imageClass}"
					alt="${alt}"
					title="${title}"
					src="${imageData.images.fallback?.src || url}"
					srcset="${imageData.images.fallback?.srcSet || ''}"
					sizes="${imageData.images.fallback?.sizes|| ''}"
					loading="${options.loading}"
					decoding="${options.decoding}"
					style="
						position: relative;
						z-index: 10;
						width:100%;
					"
				></img>
			</picture>
		`

		const maybeLinkedImage = !options.linkImagesToOriginal ? image :`
			<a
				class="gatsby-resp-image-link"
				href="${url}"
				style="display: block"
				target="_blank"
				rel="noopener"
			>
				${image}
			</a>

			`

		const captionString = options.showCaptions && (await getImageCaption({alt, title}));
		const caption = !!captionString ?
			`<figcaption class="gatsby-resp-image-figcaption">${captionString}</figcaption>` : ''

		const disableBgImage = options.disableBgImage || !imageData.placeholder?.fallback
		const bgImage = `
			<img
				class="${imageBackgroundClass}"
				${!disableBgImage ? `src="${imageData.placeholder.fallback}"` : ''}
				role="presentation"
				aria-hidden="true"
				style="
					position:absolute;
					background-color:${imageData.backgroundColor};
					width:100%;
					${!disableBgImage ?
						`height:auto;` : //height from placeholder is the same as img
						`
						height:0;
						padding-bottom:calc(100% * ${imageData.height / imageData.width})` //no placeholder, set height with https://stackoverflow.com/a/13625843/10388096
					}
				"
			></img>`

		const wrapperStyle = typeof options.wrapperStyle === `function` ? options.wrapperStyle(imageData) : options.wrapperStyle;

		return reporter.stripIndent(`
		<figure
			class="gatsby-resp-image-figure"
			style="${wrapperStyle}"
		>
			<span
				class="${imageWrapperClass}"
				style="
					position:relative;
					display:block;
				"
			>
				${bgImage}
				${maybeLinkedImage}
			</span>

			${caption}
		</figure>
		`).replace(/\r?\n|\r/gm, "")  //remove \n & \r, https://stackoverflow.com/a/10805292/10388096
	}


	const mdNodes = []
	visitWithParents(markdownAST, [`image`, `imageReference`, `html`, `jsx`], (node, ancestors) => {
		const inLink = ancestors.some(findParentLinks)
		mdNodes.push({node, inLink})
	})


	await Promise.all( mdNodes.map( ({node, inLink}) => new Promise( async resolve => {

		let newHtml = undefined

		switch(node.type){

			case 'image':
				newHtml = await generateImagesHtml(node, resolve, inLink)

				if (!newHtml)
					return resolve()

// 				console.log("Replacement html:  ", newHtml)

				node.type = 'html'
				node.value = newHtml

				return resolve()


			case 'imageReference':

				const refDef = definitions(node.identifier)
				if (!refDef)
					return resolve()

				newHtml = await generateImagesHtml({
					url:refDef.url,
					alt:node.alt,
					title:refDef.title,
				}, resolve, inLink)

				if (!newHtml)
					return resolve()

// 				console.log("Replacement html:  ", newHtml)

				node.type = 'html'
				node.value = newHtml

				return resolve()


			case 'html':
			case 'jsx':

				const $ = cheerio.load(node.value);

				if ($(`img`).length === 0) {
					// No img tags
					return resolve();
				}

				// jquery .each(func) does not accept async functions, and we need to `await generateImagesHtml`

				const imagesRefs = []
				$(`img`).each(function(){
					imagesRefs.push($(this))
				})

				await Promise.all( imagesRefs.map( thisImg => new Promise( resolve =>
					generateImagesHtml({
						url:thisImg.attr(`src`),
						alt:thisImg.attr(`alt`),
						title:thisImg.attr(`title`),
					}, resolve, inLink)
					.then(newHtml => {

						if (!newHtml)
							return resolve()

// 						console.log("Replacement html:  ", newHtml)

						thisImg.replaceWith(newHtml)
						return resolve()
					})
				)))

				node.type = 'html'
				node.value = $(`body`).html(); // fix for cheerio v1

				return resolve()

			default:
				return resolve()
		}
	})
	))

	return markdownAST
}
