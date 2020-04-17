const sharp = require('sharp');
const AWS = require('aws-sdk');

AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3();

const transforms = [
    { name: 'small', size: 85 },
    { name: 'medium', size: 160 },
    { name: 'large', size: 250 },
  ];

exports.handler = async (event, context) => {
    let filesProcessed = event.Records.map(async (record) => {
        let Bucket = record.s3.bucket.name;
        let key = record.s3.object.key;
        const sanitizedKey = key.replace(/\+/g, ' ');
        const keyWithoutExtension = sanitizedKey.replace(/.[^.]+$/, '');
     
        try {
            const image = await s3.getObject({ Bucket, Key: sanitizedKey }).promise();

            for (const t of transforms) {
                const resizedImg = await sharp(image.Body).resize(t.size, t.size,{ fit: 'inside', withoutEnlargement: true }).toFormat('jpeg').toBuffer();
                await s3.putObject({ Bucket: Bucket+"-dest", Body: resizedImg, Key: `${keyWithoutExtension}-size-${t.name}.jpg` }).promise();
            }
            
            context.succeed();
        } catch(err) {
            context.fail(`Error resizing files: ${err}`);
        }
    })

    await Promise.all(filesProcessed);
    console.log("Images resized");
    return "done";
}


