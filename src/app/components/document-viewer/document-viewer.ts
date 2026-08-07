import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy, ElementRef, ViewChild, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';

declare const pdfjsLib: any;

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <!-- Modal Overlay -->
    @if (isModal) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center" (click)="closeViewer()">
        <div class="bg-white rounded-2xl shadow-2xl w-[95vw] h-[92vh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
          <ng-container *ngTemplateOutlet="viewerContent"></ng-container>
        </div>
      </div>
    }

    <!-- Full Page Mode -->
    @if (!isModal) {
      <div class="min-h-screen bg-slate-50 flex flex-col">
        <ng-container *ngTemplateOutlet="viewerContent"></ng-container>
      </div>
    }

    <!-- Shared Viewer Template -->
    <ng-template #viewerContent>
      <!-- Header Bar -->
      <div class="bg-slate-900 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-4">
          @if (isModal) {
            <button (click)="closeViewer()" class="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          } @else {
            <button [routerLink]="['/audits', fileId()]" class="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
              <mat-icon class="text-sm">arrow_back</mat-icon>
            </button>
          }
          <div>
            <h1 class="text-sm font-bold truncate max-w-[400px]">{{ documentName() || 'Document Viewer' }}</h1>
            <p class="text-[10px] text-slate-400 truncate max-w-[400px]">{{ elementName() }}</p>
          </div>
        </div>

        <!-- Page Navigation -->
        <div class="flex items-center gap-2">
          <button (click)="prevPage()" [disabled]="currentPage() <= 1"
                  class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all">
            <mat-icon class="text-sm">chevron_left</mat-icon>
          </button>
          <span class="text-xs font-medium min-w-[80px] text-center">
            Page {{ currentPage() }} / {{ totalPages() }}
          </span>
          <button (click)="nextPage()" [disabled]="currentPage() >= totalPages()"
                  class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all">
            <mat-icon class="text-sm">chevron_right</mat-icon>
          </button>
        </div>

        <!-- Zoom & Actions -->
        <div class="flex items-center gap-2">
          <button (click)="zoomOut()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
            <mat-icon class="text-sm">remove</mat-icon>
          </button>
          <span class="text-xs font-medium min-w-[40px] text-center">{{ zoomPercent() }}%</span>
          <button (click)="zoomIn()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
            <mat-icon class="text-sm">add</mat-icon>
          </button>
          <div class="w-px h-6 bg-white/20 mx-1"></div>
          <button (click)="downloadDocument()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all" title="Download">
            <mat-icon class="text-sm">download</mat-icon>
          </button>
          <button (click)="openInNewTab()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all" title="Open in new tab">
            <mat-icon class="text-sm">open_in_new</mat-icon>
          </button>
        </div>
      </div>

      <!-- Highlight Info Bar -->
      @if (sourceText()) {
        <div class="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-3 flex-shrink-0">
          <mat-icon class="text-amber-600 text-sm">auto_awesome</mat-icon>
          <span class="text-xs text-amber-800">
            <strong>Highlighted:</strong> "{{ sourceText()!.length > 100 ? sourceText()!.substring(0, 100) + '...' : sourceText() }}"
          </span>
          @if (highlightCount() > 0) {
            <span class="ml-auto px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
              {{ highlightCount() }} match{{ highlightCount() > 1 ? 'es' : '' }}
            </span>
          }
        </div>
      }

      <!-- Split Content Area: PDF Left + Findings Right -->
      <div class="flex-1 flex overflow-hidden">
        <!-- PDF Viewer (Left) -->
        <div class="flex-1 overflow-auto bg-slate-200 relative" #scrollContainer>
          @if (loading()) {
            <div class="flex flex-col items-center justify-center h-full">
              <div class="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p class="text-slate-600 font-medium">Loading document...</p>
            </div>
          } @else if (error()) {
            <div class="flex flex-col items-center justify-center h-full">
              <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-lg text-center">
                <div class="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <mat-icon class="text-amber-600 text-3xl">info</mat-icon>
                </div>
                <h3 class="text-lg font-bold text-slate-900 mb-2">Demo Data Preview</h3>
                <p class="text-sm text-slate-500 mb-4">{{ error() }}</p>

                <!-- Mock Document Representation -->
                <div class="bg-slate-50 rounded-xl border border-slate-200 p-6 text-left mb-4">
                  <div class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
                    <mat-icon class="text-red-500">picture_as_pdf</mat-icon>
                    <span class="text-sm font-bold text-slate-900">{{ documentName() }}</span>
                  </div>
                  @if (sourceText()) {
                    <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                      <p class="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Extracted Text</p>
                      <p class="text-xs text-amber-900 font-medium">{{ sourceText() }}</p>
                    </div>
                  }
                  @if (targetPage() > 0) {
                    <p class="text-xs text-slate-500">
                      <strong>Source Page:</strong> {{ targetPage() }}
                    </p>
                  }
                  <div class="space-y-2 mt-3">
                    <div class="h-3 bg-slate-200 rounded w-full"></div>
                    <div class="h-3 bg-slate-200 rounded w-11/12"></div>
                    <div class="h-3 bg-slate-200 rounded w-9/12"></div>
                    <div class="h-3 bg-slate-200 rounded w-full"></div>
                  </div>
                </div>
                <p class="text-xs text-slate-400">Upload actual credentialing files to view real source documents with highlights.</p>
              </div>
            </div>
          } @else {
            <!-- PDF Canvas Rendering Area -->
            <div class="flex flex-col items-center py-6 gap-4">
              <div class="relative shadow-xl bg-white" #canvasContainer>
                <canvas #pdfCanvas></canvas>
                <!-- Text layer for selection & highlighting -->
                <div #textLayer class="absolute top-0 left-0 pdf-text-layer"></div>
                <!-- Highlight overlays -->
                @for (hl of highlights(); track hl.id) {
                  <div class="absolute pointer-events-none rounded-sm"
                       [style.left.px]="hl.x"
                       [style.top.px]="hl.y"
                       [style.width.px]="hl.w"
                       [style.height.px]="hl.h"
                       style="background: rgba(255, 183, 0, 0.35); border: 2px solid rgba(255, 153, 0, 0.7); box-shadow: 0 0 8px rgba(255, 183, 0, 0.3);">
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Right Panel: Compliance Findings -->
        @if (_allFindings().length > 0) {
          <div class="w-[320px] min-w-[320px] bg-white border-l border-slate-200 flex flex-col overflow-hidden">
            <!-- Panel Header -->
            <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Compliance Findings</p>
              <p class="text-[10px] text-slate-400 mt-0.5">{{ _allFindings().length }} elements — click to view</p>
            </div>

            <!-- Scrollable Findings List -->
            <div class="flex-1 overflow-y-auto">
              @for (f of _allFindings(); track f.id) {
                <div class="px-4 py-3 border-b border-slate-50 cursor-pointer transition-all"
                     [attr.data-finding-id]="f.id"
                     [ngClass]="_findingData()?.id === f.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'"
                     (click)="selectFinding(f)">
                  <!-- Finding Header Row -->
                  <div class="flex items-start gap-2.5">
                    <mat-icon class="text-[18px] mt-0.5 flex-shrink-0"
                              [ngClass]="f.status === 'PASS' ? 'text-emerald-600' : 'text-rose-500'">
                      {{ f.status === 'PASS' ? 'check_circle' : 'cancel' }}
                    </mat-icon>
                    <div class="flex-1 min-w-0">
                      <p class="text-[11px] font-bold text-slate-800 leading-snug truncate">{{ f.element }}</p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[9px] text-slate-400">{{ f.sourceDocument || 'Application' }}</span>
                        <span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                              [ngClass]="f.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
                          {{ f.status }}
                        </span>
                        @if (f.sourcePage) {
                          <span class="text-[9px] text-slate-400">Pg {{ f.sourcePage }}</span>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Expanded Detail for Selected Finding -->
                  @if (_findingData()?.id === f.id) {
                    <div class="mt-3 ml-5 space-y-2">
                      <div class="p-2.5 bg-slate-50 rounded-lg">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Finding</p>
                        <p class="text-[11px] text-slate-700 leading-relaxed">{{ f.finding }}</p>
                      </div>
                      @if (f.recommendation) {
                        <div class="p-2.5 bg-blue-50/50 rounded-lg">
                          <p class="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Recommendation</p>
                          <p class="text-[11px] text-blue-800 leading-relaxed">{{ f.recommendation }}</p>
                        </div>
                      }
                      @if (f.sourceText) {
                        <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Extracted Text</p>
                          <p class="text-[11px] text-amber-900 leading-relaxed">{{ f.sourceText }}</p>
                        </div>
                      }
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold text-slate-500">{{ f.confidence }}% confidence</span>
                        @if (f.approvalStatus && f.approvalStatus !== 'PENDING') {
                          <span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                [ngClass]="f.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
                            {{ f.approvalStatus }}
                          </span>
                        }
                      </div>

                      <!-- Action Buttons -->
                      <div class="pt-3 border-t border-slate-100 space-y-2">
                        @if (f.approvalStatus === 'APPROVED') {
                          <div class="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                            <mat-icon class="text-emerald-600 text-[16px]">check_circle</mat-icon>
                            <span class="text-[11px] font-bold text-emerald-700">Approved</span>
                          </div>
                        } @else if (f.approvalStatus === 'REJECTED') {
                          <div class="flex items-center gap-2 p-2 bg-rose-50 rounded-lg">
                            <mat-icon class="text-rose-600 text-[16px]">cancel</mat-icon>
                            <span class="text-[11px] font-bold text-rose-700">Rejected</span>
                          </div>
                        } @else {
                          <div class="flex items-center gap-2">
                            <button (click)="handleApprove($event, f)"
                                    class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm">
                              <mat-icon class="text-[14px]">check_circle</mat-icon>
                              Approve
                            </button>
                            <button (click)="handleReject($event, f)"
                                    class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm">
                              <mat-icon class="text-[14px]">cancel</mat-icon>
                              Reject
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </ng-template>
  `,
  styles: [`
    .pdf-text-layer {
      opacity: 0;
      line-height: 1;
    }
    .pdf-text-layer > span {
      color: transparent;
      position: absolute;
      white-space: pre;
      transform-origin: 0 0;
    }
    .pdf-text-layer .highlight {
      background: rgba(255, 183, 0, 0.5);
      border-radius: 2px;
      color: transparent;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentViewer implements OnInit, OnDestroy, AfterViewInit {
  private route = inject(ActivatedRoute);

  @ViewChild('pdfCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('textLayer') textLayerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollContainer') scrollContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasContainer') canvasContainerRef!: ElementRef<HTMLDivElement>;

  // Inputs for modal usage
  @Input() isModal = false;
  @Input() set pdfUrl(val: string) { if (val) this._pdfUrl.set(val); }
  @Input() set docName(val: string) { if (val) this.documentName.set(val); }
  @Input() set elemName(val: string) { if (val) this.elementName.set(val); }
  @Input() set page(val: number) { if (val) this.targetPage.set(val); }
  @Input() set searchText(val: string) { if (val != null) this.sourceText.set(val); }
  @Input() set findingData(val: any) {
    if (val) {
      this._findingData.set(val);
      setTimeout(() => this.scrollSelectedFindingIntoView(), 100);
    }
  }
  @Input() set allFindings(val: any[]) { if (val) this._allFindings.set(val); }
  @Input() viewerFileId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() approved = new EventEmitter<any>();
  @Output() rejected = new EventEmitter<any>();

  _findingData = signal<any>(null);
  _allFindings = signal<any[]>([]);
  _pdfUrl = signal<string>('');
  fileId = signal<string>('');
  documentName = signal<string>('');
  elementName = signal<string>('');
  sourceText = signal<string>('');
  loading = signal(true);
  error = signal<string | null>(null);
  currentPage = signal(1);
  totalPages = signal(1);
  targetPage = signal(0);
  zoomScale = signal(1.5);
  highlights = signal<Array<{ id: number; x: number; y: number; w: number; h: number }>>([]);
  highlightCount = signal(0);

  private pdfDoc: any = null;
  private pdfjsLoaded = false;
  private renderTask: any = null;

  zoomPercent = () => Math.round(this.zoomScale() * 100);

  ngOnInit() {
    // Route-based usage (full page)
    if (!this.isModal) {
      const fId = this.route.snapshot.paramMap.get('fileId') || '';
      const docName = this.route.snapshot.paramMap.get('documentName') || '';
      const element = this.route.snapshot.queryParamMap.get('element') || '';
      const page = this.route.snapshot.queryParamMap.get('page') || '';
      const text = this.route.snapshot.queryParamMap.get('search') || '';

      this.fileId.set(fId);
      this.documentName.set(decodeURIComponent(docName));
      this.elementName.set(decodeURIComponent(element));
      if (page) this.targetPage.set(parseInt(page, 10));
      if (text) this.sourceText.set(decodeURIComponent(text));

      this._pdfUrl.set(`/api/documents/${fId}/${encodeURIComponent(this.documentName())}`);
    }

    this.loadPdfJs();
  }

  ngAfterViewInit() {
    // If PDF.js is already loaded (cached), start rendering
    if (this.pdfjsLoaded && this._pdfUrl()) {
      this.loadPdf();
    }
  }

  ngOnDestroy() {
    if (this.renderTask) {
      this.renderTask.cancel();
    }
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
    }
  }

  private loadPdfJs() {
    // Check if already loaded
    if (typeof pdfjsLib !== 'undefined') {
      this.pdfjsLoaded = true;
      this.loadPdf();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
    script.type = 'module';

    // For module scripts, we use a different approach
    const inlineScript = document.createElement('script');
    inlineScript.type = 'module';
    inlineScript.textContent = `
      import * as pdfjs from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
      window.pdfjsLib = pdfjs;
      window.dispatchEvent(new Event('pdfjsReady'));
    `;

    const onReady = () => {
      window.removeEventListener('pdfjsReady', onReady);
      this.pdfjsLoaded = true;
      this.loadPdf();
    };

    window.addEventListener('pdfjsReady', onReady);
    document.head.appendChild(inlineScript);
  }

  private async loadPdf() {
    const url = this._pdfUrl();
    if (!url) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      // First check if the document exists
      const headResponse = await fetch(url, { method: 'HEAD' });
      if (!headResponse.ok) {
        this.loading.set(false);
        this.error.set('This is demo data — no actual documents were uploaded. Upload real credentialing files to view source documents.');
        return;
      }

      // Ensure pdfjsLib is available
      if (typeof pdfjsLib === 'undefined') {
        // Wait a bit and retry
        setTimeout(() => this.loadPdf(), 500);
        return;
      }

      const loadingTask = pdfjsLib.getDocument(url);
      this.pdfDoc = await loadingTask.promise;
      this.totalPages.set(this.pdfDoc.numPages);

      // Navigate to target page
      const startPage = this.targetPage() > 0 && this.targetPage() <= this.pdfDoc.numPages 
        ? this.targetPage() 
        : 1;
      this.currentPage.set(startPage);

      this.loading.set(false);

      // Wait for view to update, then render
      setTimeout(() => this.renderPage(this.currentPage()), 50);
    } catch (err: any) {
      console.error('PDF load error:', err);
      this.loading.set(false);
      this.error.set('Failed to load document. This may be demo data without actual uploaded files.');
    }
  }

  private async renderPage(pageNum: number) {
    if (!this.pdfDoc || !this.canvasRef) return;

    try {
      // Cancel any existing render
      if (this.renderTask) {
        this.renderTask.cancel();
        this.renderTask = null;
      }

      const page = await this.pdfDoc.getPage(pageNum);
      const scale = this.zoomScale();
      const viewport = page.getViewport({ scale });

      const canvas = this.canvasRef.nativeElement;
      const context = canvas.getContext('2d')!;

      // Set canvas size for HiDPI
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      this.renderTask = page.render({
        canvasContext: context,
        viewport,
        transform
      });

      await this.renderTask.promise;
      this.renderTask = null;

      // Render text layer and do highlighting
      await this.renderTextLayer(page, viewport);

    } catch (err: any) {
      if (err?.name !== 'RenderingCancelled') {
        console.error('Page render error:', err);
      }
    }
  }

  private async renderTextLayer(page: any, viewport: any) {
    if (!this.textLayerRef) return;

    const textLayerEl = this.textLayerRef.nativeElement;
    textLayerEl.innerHTML = '';
    textLayerEl.style.width = viewport.width + 'px';
    textLayerEl.style.height = viewport.height + 'px';

    const textContent = await page.getTextContent();
    const textItems = textContent.items;

    const searchStr = this.sourceText()?.toLowerCase().trim() || '';
    const newHighlights: Array<{ id: number; x: number; y: number; w: number; h: number }> = [];
    let hlId = 0;

    for (const item of textItems) {
      if (!item.str) continue;

      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const span = document.createElement('span');
      span.textContent = item.str;

      // Position the text span
      const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
      const x = tx[4];
      const y = tx[5] - fontSize;

      span.style.left = x + 'px';
      span.style.top = y + 'px';
      span.style.fontSize = fontSize + 'px';
      span.style.fontFamily = item.fontName || 'sans-serif';

      // Check for text match
      if (searchStr && item.str.toLowerCase().includes(searchStr)) {
        span.classList.add('highlight');

        // Create highlight overlay
        const w = item.width * viewport.scale;
        const h = fontSize * 1.2;
        newHighlights.push({ id: hlId++, x, y, w, h });
      } else if (searchStr) {
        // Smart fallback: prefer specific tokens (dates, IDs) over generic words
        // to avoid over-highlighting common words like "Attestation" throughout the document
        const itemLower = item.str.toLowerCase();
        const dateTokens = searchStr.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g) || [];
        const specificTokens = dateTokens.filter(d => d.length >= 6);

        if (specificTokens.length > 0) {
          // Only highlight items that contain the specific date/ID token
          for (const token of specificTokens) {
            if (itemLower.includes(token.toLowerCase())) {
              span.classList.add('highlight');
              const w = item.width * viewport.scale;
              const h = fontSize * 1.2;
              newHighlights.push({ id: hlId++, x, y, w, h });
              break;
            }
          }
        } else {
          // Fall back to longest word ≥ 10 chars only (avoids short common words)
          const words = searchStr.split(/\s+/);
          const longWords = words.filter(w => w.length >= 10).sort((a, b) => b.length - a.length);
          for (const word of longWords) {
            if (itemLower.includes(word.toLowerCase())) {
              span.classList.add('highlight');
              const w = item.width * viewport.scale;
              const h = fontSize * 1.2;
              newHighlights.push({ id: hlId++, x, y, w, h });
              break;
            }
          }
        }
      }

      textLayerEl.appendChild(span);
    }

    this.highlights.set(newHighlights);
    this.highlightCount.set(newHighlights.length);

    // Scroll to first highlight
    if (newHighlights.length > 0 && this.scrollContainerRef) {
      setTimeout(() => {
        const firstHl = newHighlights[0];
        const container = this.scrollContainerRef.nativeElement;
        container.scrollTo({
          top: Math.max(0, firstHl.y - 100),
          behavior: 'smooth'
        });
      }, 200);
    }
  }

  // Navigation
  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.renderPage(this.currentPage());
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.renderPage(this.currentPage());
    }
  }

  // Zoom
  zoomIn() {
    if (this.zoomScale() < 3) {
      this.zoomScale.set(Math.round((this.zoomScale() + 0.25) * 100) / 100);
      this.renderPage(this.currentPage());
    }
  }

  zoomOut() {
    if (this.zoomScale() > 0.5) {
      this.zoomScale.set(Math.round((this.zoomScale() - 0.25) * 100) / 100);
      this.renderPage(this.currentPage());
    }
  }

  // Actions
  closeViewer() {
    this.closed.emit();
  }

  downloadDocument() {
    const a = document.createElement('a');
    a.href = this._pdfUrl();
    a.download = this.documentName();
    a.click();
  }

  openInNewTab() {
    window.open(this._pdfUrl(), '_blank');
  }

  handleApprove(event: Event, f: any) {
    event.stopPropagation();
    this.approved.emit(f);
  }

  handleReject(event: Event, f: any) {
    event.stopPropagation();
    this.rejected.emit(f);
  }

  selectFinding(f: any) {
    if (this._findingData()?.id === f.id) return;

    this._findingData.set(f);
    this.scrollSelectedFindingIntoView();
    this.elementName.set(f.element);
    this.sourceText.set(f.sourceText || '');

    // Check if the document changed
    const newDocName = f.sourceDocument || f.element;
    const newUrl = this.viewerFileId
      ? `/api/documents/${this.viewerFileId}/${encodeURIComponent(newDocName)}`
      : this._pdfUrl();

    if (newUrl !== this._pdfUrl()) {
      this.documentName.set(newDocName);
      this._pdfUrl.set(newUrl);
      this.loadPdf();
    } else if (f.sourcePage && f.sourcePage !== this.currentPage()) {
      this.currentPage.set(f.sourcePage);
      this.renderPage(f.sourcePage);
    } else {
      this.renderPage(this.currentPage());
    }
  }

  private scrollSelectedFindingIntoView() {
    const selectedId = this._findingData()?.id;
    if (!selectedId) return;

    const selectedElement = document.querySelector(`[data-finding-id="${CSS.escape(selectedId)}"]`);
    selectedElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
