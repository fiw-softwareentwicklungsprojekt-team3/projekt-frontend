import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProfileService],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sendet PUT /api/me mit dem neuen Startsemester', () => {
    service.updateMe({ startSemester: 'WS 2025' }).subscribe();

    const req = httpMock.expectOne('/api/me');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ startSemester: 'WS 2025' });
    req.flush({ id: 1, email: 'test@student.htw-berlin.de', role: 'STUDIERENDE', startSemester: 'WS 2025' });
  });
});
