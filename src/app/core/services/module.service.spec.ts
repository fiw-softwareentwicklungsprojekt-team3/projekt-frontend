import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ModuleDto, ModuleService } from './module.service';

describe('ModuleService', () => {
  let service: ModuleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ModuleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sollte die Modulliste über GET /api/modules laden', () => {
    const beispielModule: ModuleDto[] = [
      {
        code: 'B11',
        name: 'Einführung in die Programmierung',
        semester: 1,
        type: 'P',
        lp: 5,
        lectureHours: 2,
        exerciseHours: 2,
        term: 'WS',
      },
    ];

    service.getModules().subscribe((module) => {
      expect(module).toEqual(beispielModule);
    });

    const req = httpMock.expectOne('/api/modules');
    expect(req.request.method).toBe('GET');
    req.flush(beispielModule);
  });
});

