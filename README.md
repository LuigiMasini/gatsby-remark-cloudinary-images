# gatsby-remark-cloudinary-images

Responsive cloudinary images in markdown.

Based on [gatsby-remark-images](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-remark-images)

This plugin process cloudinary images in markdown using `gatsby-transformer-cloudinary`'s API and generate responsive images like `gatsby-remark-images`.
With this plugin you need not to download your images when building.

> __NOTE:__ the images need to be already on cloudinary and referenced in markdown like `[img](https://res.cloudinary.com/...)`


## Install

```sh
yarn add gatsby-remark-cloudinary-images

#min version required: @3.0.0
yarn upgrade gatsby-transformer-cloudinary
```

## Configure


In `gatsby-config.js` :

```js
module.exports = {
  plugins: [
    // ...
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
        // ...
          {
            resolve:`gatsby-remark-cloudinary-images`,
            options: {
              cloudName: process.env.CLOUDINARY_CLOUD_NAME,
              // options
            },
          },
          {
            resolve:`gatsby-remark-images/`,
            options: {},
          },
        ]
      },
    },
  ],
}
```

### Options

#### Required options

- `cloudName`: Cloud name of your Cloudinary account

#### Options from `gatsby-remark-images`

- `showCaptions` (default: `false`)
- `markdownCaptions` (default: `false`)
- `linkImagesToOriginal` (default: `true`)
- `disableBGImage` (default: `false`)
- `loading` (default: `'lazy'`)
- `decoding` (default: `'async'`)
- `wrapperStyle` (default: ``)

See the [original documentation](https://github.com/gatsbyjs/gatsby/tree/d8efbc219c3f4c4250f1681d87757e2980ad6afc/packages/gatsby-remark-images) for details about each option.

#### Options from `gatsby-plugin-image`

- `placeholder` : only accept `blurred` and `tracedSVG`
- `formats` (default: `['auto', 'webp']`)
- `placeholderUrl`
- `width`
- `height`
- `sizes`
- `fit`
- `breakpoints` (default: `[750, 1080, 1366, 1920]`)
- `backgroundColor` (default: `'white'`)
- `aspectRatio`


See the [original documentation](https://www.gatsbyjs.com/docs/reference/built-in-components/gatsby-plugin-image/#all-options) for details about each option.

