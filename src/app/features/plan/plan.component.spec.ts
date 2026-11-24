import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanResponse } from '../../core/services/plan.service';
import { PlanComponent } from './plan.component';

describe('PlanComponent', () => {
  let fixture: ComponentFixture<PlanComponent>;
  let component: PlanComponent;
  let httpMock: HttpTestingController;

  const leererPlan: PlanResponse = {
    startSemester: 'WS 2026',
    totalLp: 0,
    maxLpPerSemester: 30,
    semesters: [],
  };

  /** Beantwortet die beiden Anfragen beim Start der Seite. */
  function startAnfragenBeantworten(plan: PlanResponse): void {
    httpMock.expectOne('/api/plan').flush(plan);
    httpMock.expectOne('/api/results').flush([]);
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlanComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --- Tests aus #42 (Rawan), an die Spalten angepasst ---

  it('sollte während des Ladens einen Ladezustand anzeigen', () => {
    fixture.detectChanges();

    expect(text()).toContain('Studienplan wird geladen');

    startAnfragenBeantworten(leererPlan);
    expect(text()).not.toContain('Studienplan wird geladen');
  });

  it('sollte LP und SWS pro Semester anzeigen', () => {
    fixture.detectChanges();

    startAnfragenBeantworten({
      startSemester: 'WS 2026',
      totalLp: 30,
      maxLpPerSemester: 30,
      semesters: [
        {
          semester: 'WS 2026',
          lp: 30,
          sws: 26,
          lpLimitExceeded: false,
          entries: [
            {
              id: 1,
              moduleCode: 'B11',
              moduleName: 'Programmierung 1',
              lp: 6,
              recommendedSemester: 1,
              offerCode: null,
              offerName: null,
              courseCode: null,
              courseTitle: null,
              prerequisitesMet: true,
              violations: [],
            },
          ],
        },
      ],
    });

    const kopf = (fixture.nativeElement as HTMLElement).querySelector('.semester-header');
    expect(kopf?.textContent).toContain('WS 2026');
    expect(kopf?.textContent).toContain('30 LP');
    expect(kopf?.textContent).toContain('26 SWS');
    expect(text()).toContain('Gesamt: 30 LP');
  });

  it('sollte bei genau 30 LP keine Warnung anzeigen', () => {
    fixture.detectChanges();

    startAnfragenBeantworten({
      ...leererPlan,
      totalLp: 30,
      semesters: [{ semester: 'WS 2026', lp: 30, sws: 20, lpLimitExceeded: false, entries: [] }],
    });

    expect((fixture.nativeElement as HTMLElement).querySelector('.warnung')).toBeNull();
  });

  it('sollte bei 31 LP eine Warnung mit der Grenze anzeigen', () => {
    fixture.detectChanges();

    startAnfragenBeantworten({
      ...leererPlan,
      totalLp: 31,
      semesters: [{ semester: 'WS 2026', lp: 31, sws: 20, lpLimitExceeded: true, entries: [] }],
    });

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.warnung')).not.toBeNull();
    expect(element.querySelector('.semester-card.ueberlast')?.getAttribute('aria-label')).toBe(
      'WS 2026',
    );
    expect(text()).toContain('31 LP');
    expect(text()).toContain('Limit von 30 LP');
  });

  it('sollte einen leeren Plan anzeigen', () => {
    fixture.detectChanges();

    startAnfragenBeantworten(leererPlan);

    expect(text()).toContain('Noch keine Module eingeplant.');
    // Auch ein leerer Plan zeigt Spalten, damit Module eingeplant werden können
    expect(component.spaltenNamen()).toEqual(['WS 2026', 'SS 2027']);
  });

  it('sollte einen Backend-Fehler anzeigen', () => {
    fixture.detectChanges();

    httpMock
      .expectOne('/api/plan')
      .flush(
        { message: 'Der Studienplan konnte nicht geladen werden.' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    // forkJoin hat sich nach dem Fehler abgemeldet; die übrigen Anfragen nur noch abräumen.
    httpMock.match('/api/results');
    fixture.detectChanges();

    expect(text()).toContain('Der Studienplan konnte nicht geladen werden.');
  });

  // --- Neu in US-40 ---

  it('sollte Lücken füllen: eine Spalte pro Semester plus ein leeres', () => {
    fixture.detectChanges();

    startAnfragenBeantworten({
      ...leererPlan,
      totalLp: 11,
      semesters: [
        { semester: 'WS 2026', lp: 6, sws: 6, lpLimitExceeded: false, entries: [] },
        { semester: 'WS 2027', lp: 5, sws: 4, lpLimitExceeded: false, entries: [] },
      ],
    });

    expect(component.spaltenNamen()).toEqual(['WS 2026', 'SS 2027', 'WS 2027', 'SS 2028']);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.semester-card').length).toBe(
      4,
    );
  });
});