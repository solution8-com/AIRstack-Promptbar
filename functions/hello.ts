import { Request, Response } from '@nhost/functions';

/**
 * Example serverless function
 * Demonstrates basic function structure
 */
export default async (req: Request, res: Response) => {
  const { name = 'World' } = req.body || {};
  
  res.status(200).json({
    message: `Hello, ${name}!`,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};
