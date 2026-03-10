import { Request, Response } from '@nhost/functions';

/**
 * Health check function
 * Returns the status of the application
 */
export default async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'prompts.chat is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0'
  });
};
