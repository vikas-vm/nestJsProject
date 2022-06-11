import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  Response,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import { createReadStream } from 'fs';
import { diskStorage } from 'multer';
import { extname, parse } from 'path';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';

// @UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  @Get('me')
  getMe(@GetUser() user: User) {
    return user;
  }
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (!['.jpg', '.png'].includes(parse(file.originalname).ext)) {
          return cb(null, false);
        }
        cb(null, true);
      },
      storage: diskStorage({
        destination: 'src/uploads',
        filename: (req, file, cb) => {
          const randomName = Array(5)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(
            null,
            `${parse(file.originalname).name}_${randomName}${extname(
              file.originalname,
            )}`,
          );
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
    return { url: `http://localhost:3000/api/v1/users/file/${file.filename}` };
  }

  @Get('file/:filename')
  getFile(
    @Param('filename') filename: string,
    @Response({ passthrough: true }) res: Response,
  ) {
    const file = createReadStream('src/uploads/' + filename);
    return new StreamableFile(file);
  }
}
