import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';

import buildExec from './buildExec';
import {
  getBaseUrl,
  getPlatform,
  getUploaderName,
  setFailure,
} from './helpers';

import verify from './validate';
import versionInfo from './version';

let failCi;

try {
  const {execArgs, options, failCi, os, uploaderVersion, verbose} = buildExec();
  const platform = getPlatform(os);

  const filename = path.join( __dirname, getUploaderName(platform));

  https.get(getBaseUrl(platform, uploaderVersion), (res) => {
    const filePath = fs.createWriteStream(filename);
    res.pipe(filePath);
    filePath
        .on('error', (err) => {
          if (fs.existsSync(filename)) {
            core.info('IT EXISTS');
          } else {
            core.info('IT DOESNT EXIST');
          }
          setFailure(
              `Codecov:Failed to write uploader binary: ${err.message}\n${err}`,
              true,
          );
          core.info(`${console.trace()}`);
        }).on('finish', async () => {
          if (fs.existsSync(filename)) {
            core.info('IT EXISTS');
          } else {
            core.info('IT DOESNT EXIST');
          }
          filePath.close();
          if (fs.existsSync(filename)) {
            core.info('IT EXISTS');
          } else {
            core.info('IT DOESNT EXIST');
          }

          await verify(filename, platform, uploaderVersion, verbose, failCi);
          await versionInfo(platform, uploaderVersion);
          await fs.chmodSync(filename, '777');

          const unlink = () => {
            fs.unlink(filename, (err) => {
              if (err) {
                setFailure(
                    `Codecov: Could not unlink uploader: ${err.message}`,
                    failCi,
                );
              }
            });
          };
          await exec.exec(filename, execArgs, options)
              .catch((err) => {
                setFailure(
                    `Codecov: Failed to properly upload: ${err.message}`,
                    failCi,
                );
              }).then(() => {
                unlink();
              });
        });
  });
} catch (err) {
  setFailure(`Codecov: Encountered an unexpected error ${err.message}`, failCi);
}
