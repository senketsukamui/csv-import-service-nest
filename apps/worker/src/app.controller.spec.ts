import { Test, type TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ImportProcessorService } from './processor/import-processor.service';

describe('AppController', () => {
  let appController: AppController;
  const processorService = {
    process: jest.fn(),
  };

  beforeEach(async () => {
    processorService.process.mockReset();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ImportProcessorService,
          useValue: processorService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('handleImport', () => {
    it('processes import messages', async () => {
      await appController.handleImport({ importId: 'import-id' });

      expect(processorService.process).toHaveBeenCalledWith('import-id');
    });
  });
});
