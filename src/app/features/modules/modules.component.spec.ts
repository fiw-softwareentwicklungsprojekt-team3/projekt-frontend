import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModuleDetailDto, ModuleDto } from '../../core/services/module.service';
import { ModulesComponent } from './modules.component';

describe('ModulesComponent', () => {
  let fixture: ComponentFixture<ModulesComponent>;
  let component: ModulesComponent;
  let httpMock: HttpTestingController;

  const unsortierteModule: ModuleDto[] = [
    {
      code: 'B34',
      name: 'Softwareentwicklungsprojekt',
      semester: 3,
      type: 'P',
      lp: 10,
      lectureHours: 0,
      exerciseHours: 6,
      term: 'WS',
    },
    {
      code: 'B12',
      name: 'Rechnerarchitektur/Betriebssysteme',
      semester: 1,
      type: 'P',
      lp: 5,
      lectureHours: 2,
      exerciseHours: 2,
      term: 'WS',
    },
    {
      code: 'B11',
      name: 'Programmierung 1',
      semester: 1,
      type: 'P',
      lp: 6,
      lectureHours: 4,
      exerciseHours: 2,
      term: 'WS',
    },
    {
      code: 'B41',
      name: 'Wahlpflichtmodul (Wirtschafts-)Informatik 1',
      semester: 4,
      type: 'WP',
      lp: 5,
      lectureHours: 0,
      exerciseHours: 4,
      term: 'SS',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModulesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ModulesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sollte während des Ladens einen Ladezustand anzeigen', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Module werden geladen');

    httpMock.expectOne('/api/modules').flush([]);
    fixture.detectChanges();

    expect(element.textContent).not.toContain('Module werden geladen');
  });

  it('sollte Module nach Fachsemester und Modulcode sortiert in einer mat-table mit allen Spalten anzeigen', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/modules').flush(unsortierteModule);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const tabelle = element.querySelector('table[mat-table]');
    expect(tabelle).toBeTruthy();

    const zeilen = Array.from(element.querySelectorAll('tr.module-row'));
    expect(zeilen.length).toBe(4);

    // Sortierte Reihenfolge: B11 (Sem 1), B12 (Sem 1), B34 (Sem 3), B41 (Sem 4)
    expect(zeilen[0].textContent).toContain('B11');
    expect(zeilen[0].textContent).toContain('Programmierung 1');
    expect(zeilen[0].textContent).toContain('1');
    expect(zeilen[0].textContent).toContain('P');
    expect(zeilen[0].textContent).toContain('6');
    expect(zeilen[0].textContent).toContain('6 (4V + 2Ü)');
    expect(zeilen[0].textContent).toContain('WS');

    expect(zeilen[1].textContent).toContain('B12');
    expect(zeilen[2].textContent).toContain('B34');
    expect(zeilen[3].textContent).toContain('B41');
    expect(zeilen[3].textContent).toContain('WP');
    expect(zeilen[3].textContent).toContain('SS');
  });

  it('sollte Filteränderungen mit semester, type und term ans Backend senden und zurücksetzen können', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/modules').flush(unsortierteModule);
    fixture.detectChanges();

    // Fachsemester-Filter setzen
    component['setzeSemesterFilter'](3);
    const reqSemester = httpMock.expectOne(
      (r) => r.url === '/api/modules' && r.params.get('semester') === '3',
    );
    reqSemester.flush([unsortierteModule[0]]);

    // Zusätzlich Modulart-Filter setzen
    component['setzeTypeFilter']('P');
    const reqType = httpMock.expectOne(
      (r) =>
        r.url === '/api/modules' &&
        r.params.get('semester') === '3' &&
        r.params.get('type') === 'P',
    );
    reqType.flush([unsortierteModule[0]]);

    // Zusätzlich Turnus-Filter setzen
    component['setzeTermFilter']('WS');
    const reqTerm = httpMock.expectOne(
      (r) =>
        r.url === '/api/modules' &&
        r.params.get('semester') === '3' &&
        r.params.get('type') === 'P' &&
        r.params.get('term') === 'WS',
    );
    reqTerm.flush([unsortierteModule[0]]);
    fixture.detectChanges();

    const zeilenGefiltert = fixture.nativeElement.querySelectorAll('tr.module-row');
    expect(zeilenGefiltert.length).toBe(1);

    // Filter zurücksetzen
    component['filterZuruecksetzen']();
    const reqReset = httpMock.expectOne(
      (r) => r.url === '/api/modules' && r.params.keys().length === 0,
    );
    reqReset.flush(unsortierteModule);
    fixture.detectChanges();

    const zeilenAlle = fixture.nativeElement.querySelectorAll('tr.module-row');
    expect(zeilenAlle.length).toBe(4);
  });

  it('sollte eine geöffnete Detailansicht beim Ändern eines Filters automatisch schließen', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/modules').flush(unsortierteModule);
    fixture.detectChanges();

    // Modul B34 (3. Semester) ausklappen
    component['waehleModul']('B34');
    httpMock.expectOne('/api/modules/B34').flush({
      code: 'B34',
      name: 'Softwareentwicklungsprojekt',
      semester: 3,
      type: 'P',
      area: 'FACH',
      hasChoice: false,
      lp: 10,
      lectureHours: 0,
      exerciseHours: 6,
      level: '1b',
      term: 'WS',
      countsForFinalGrade: true,
      graded: true,
      prerequisites: [],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.detail-panel')).toBeTruthy();

    // Filter auf 1. Semester ändern -> Detailansicht muss geschlossen sein
    component['setzeSemesterFilter'](1);
    httpMock
      .expectOne((r) => r.url === '/api/modules' && r.params.get('semester') === '1')
      .flush([unsortierteModule[1], unsortierteModule[2]]);
    fixture.detectChanges();

    expect(component['ausgewaehlterCode']()).toBeNull();
    expect(fixture.nativeElement.querySelector('.detail-panel')).toBeNull();
  });

  it('sollte bei Klick auf ein Modul GET /api/modules/{code} aufrufen und NOTWENDIG sowie EMPFOHLEN inkl. minLp/toleranceLp direkt unter dem Modul darstellen', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/modules').flush(unsortierteModule);
    fixture.detectChanges();

    const ersteZeile = fixture.nativeElement.querySelector('tr.module-row') as HTMLElement;
    ersteZeile.click();
    fixture.detectChanges();

    const detailReq = httpMock.expectOne('/api/modules/B11');
    const b66Detail: ModuleDetailDto = {
      code: 'B66',
      name: 'Bachelorarbeit',
      semester: 6,
      type: 'P',
      area: 'FACH',
      hasChoice: false,
      lp: 12,
      lectureHours: 0,
      exerciseHours: 0,
      level: '1b',
      term: 'SS',
      countsForFinalGrade: false,
      graded: true,
      prerequisites: [
        { kind: 'NOTWENDIG', moduleCode: 'B11', moduleName: 'Programmierung 1' },
        { kind: 'NOTWENDIG', minLp: 151, toleranceLp: 10 },
        { kind: 'EMPFOHLEN', moduleCode: 'B21', moduleName: 'Programmierung 2' },
      ],
    };
    detailReq.flush(b66Detail);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    // Prüfe, dass die Detailansicht als Tabellenzeile direkt unter der Modulzeile liegt
    expect(ersteZeile.nextElementSibling?.classList.contains('detail-row--expanded')).toBe(true);

    const notwendige = element.querySelectorAll('.prerequisite-item--notwendig');
    const empfohlene = element.querySelectorAll('.prerequisite-item--empfohlen');

    expect(notwendige.length).toBe(2);
    expect(notwendige[0].textContent).toContain('NOTWENDIG');
    expect(notwendige[0].textContent).toContain('B11 – Programmierung 1');
    expect(notwendige[1].textContent).toContain('Mindestens 151 LP (Toleranz: 10 LP)');

    expect(empfohlene.length).toBe(1);
    expect(empfohlene[0].textContent).toContain('EMPFOHLEN');
    expect(empfohlene[0].textContent).toContain('B21 – Programmierung 2');
  });

  it('sollte bei Modulen ohne Voraussetzungen den Hinweis „Keine Voraussetzungen“ anzeigen', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/modules').flush(unsortierteModule);
    fixture.detectChanges();

    component['waehleModul']('B11');
    const detailOhneVoraussetzungen: ModuleDetailDto = {
      code: 'B11',
      name: 'Programmierung 1',
      semester: 1,
      type: 'P',
      area: 'FACH',
      hasChoice: false,
      lp: 6,
      lectureHours: 4,
      exerciseHours: 2,
      level: '1a',
      term: 'WS',
      countsForFinalGrade: false,
      graded: true,
      prerequisites: [],
    };
    httpMock.expectOne('/api/modules/B11').flush(detailOhneVoraussetzungen);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Keine Voraussetzungen');
  });

  it('sollte bei einem Backend-Fehler die message aus dem Fehlerformat (US-49) anzeigen', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/modules').flush(
      {
        status: 400,
        error: 'Bad Request',
        message: 'Ungültiger Wert für semester: erlaubt sind 1 bis 6.',
        path: '/api/modules',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Ungültiger Wert für semester: erlaubt sind 1 bis 6.');
  });

  it('sollte bei nicht erreichbarem Backend (Status 0) eine verständliche Fehlermeldung anzeigen', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/modules').error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain(
      'Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.',
    );
  });
});
