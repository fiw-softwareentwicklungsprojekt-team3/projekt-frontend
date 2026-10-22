describe('CI Failure Demonstration', () => {
  it('soll fehlschlagen fuer den CI-Nachweis im Ticket', () => {
    expect(true).toBe(false);
  });
});