import * as Siema from 'siema';

import { SyncEvent } from '../../event/SyncEvent';
import { WhitePage } from '../WhitePage/index';
import { addClassName, createDivWithClassName } from '../../utils/dom';
import { WhiteboardSnap } from '../AbstractWhiteboard/snap';
import { AbstractWhiteboard } from '../AbstractWhiteboard/index';

import './index.less';

const LeftArrowIcon = require('../../assets/bx-left-arrow.svg');
const RightArrowIcon = require('../../assets/bx-right-arrow.svg');

const prefix = 'fcw-board';

export class Whiteboard extends AbstractWhiteboard {
  /** 初始化操作 */
  protected init() {
    // 为 target 添加子 imgs 容器
    this.imgsContainer = createDivWithClassName(`${prefix}-imgs`, this.target);
    // 为 target 添加子 pages 容器
    this.pagesContainer = createDivWithClassName(`${prefix}-pages`, this.target);

    if (this.mode === 'master') {
      this.initMaster();

      this.emitSnapshot();
    }

    if (this.mode === 'mirror') {
      this.initMirror();
    }
  }

  /** 以主模式启动 */
  private initMaster() {
    // 初始化所有的 WhitePages
    this.sources.forEach(source => {
      const page = new WhitePage(
        { imgSrc: source },
        {
          mode: this.mode,
          whiteboard: this,
          parentContainer: this.pagesContainer
        }
      );

      // 这里隐藏 Dashboard 的图片源，Siema 切换的是占位图片
      page.container.style.visibility = 'hidden';

      this.pages.push(page);
    });

    this.initSiema();

    // 初始化控制节点
    const controller = createDivWithClassName(`${prefix}-controller`, this.target);

    const prevEle = createDivWithClassName(`${prefix}-flip-arrow`, controller);
    prevEle.innerHTML = LeftArrowIcon;

    const nextEle = createDivWithClassName(`${prefix}-flip-arrow`, controller);
    nextEle.innerHTML = RightArrowIcon;

    nextEle!.addEventListener('click', () => {
      const nextPageIndex =
        this.visiblePageIndex + 1 > this.pages.length - 1 ? 0 : this.visiblePageIndex + 1;
      this.onPageChange(nextPageIndex);
    });
    prevEle!.addEventListener('click', () => {
      const nextPageIndex =
        this.visiblePageIndex - 1 < 0 ? this.pages.length - 1 : this.visiblePageIndex - 1;

      this.onPageChange(nextPageIndex);
    });
  }

  /** 以镜像模式启动 */
  private initMirror() {
    if (!this.eventHub) {
      throw new Error('Invalid eventHub');
    }

    this.eventHub.on('sync', (ev: SyncEvent) => {
      if (ev.target !== 'whiteboard' || !ev.border) {
        return;
      }

      if (ev.event === 'borderSnap') {
        this.applySnap(ev.border);
      }

      if (ev.event === 'borderChangePage' && ev.id === this.id) {
        if (this.isInitialized) {
          this.onPageChange(ev.border.visiblePageIndex);
        }
      }
    });
  }

  /** 初始化 Siema */
  private initSiema() {
    // 初始化所有的占位图片，用于给 Siema 播放使用
    this.sources.forEach(source => {
      const imgEle = document.createElement('img');
      addClassName(imgEle, `${prefix}-img`);
      imgEle.src = source;
      imgEle.alt = 'Siema image';

      this.imgsContainer.appendChild(imgEle);
    });

    // 初始化 Siema，并且添加控制节点
    this.siema = new Siema({
      selector: this.imgsContainer,
      duration: 200,
      easing: 'ease-out',
      perPage: 1,
      startIndex: 0,
      draggable: false,
      multipleDrag: true,
      threshold: 20,
      loop: false,
      rtl: false
    });
  }

  /** 响应页面切换的事件 */
  private onPageChange(nextPageIndex: number) {
    if (this.visiblePageIndex === nextPageIndex) {
      return;
    }

    this.siema.goTo(nextPageIndex);
    this.visiblePageIndex = nextPageIndex;

    // 将所有的 Page 隐藏
    this.pages.forEach((page, i) => {
      if (nextPageIndex === i) {
        page.show();
      } else {
        page.hide();
      }
    });

    this.emit({
      event: 'borderChangePage',
      id: this.id,
      target: 'whiteboard',
      border: this.captureSnap()
    });
  }

  /** 触发快照事件 */
  private emitSnapshot() {
    const innerFunc = () => {
      this.emit({
        event: 'borderSnap',
        id: this.id,
        target: 'whiteboard',
        border: this.captureSnap(false)
      });
    };

    // 定期触发事件
    this.emitInterval = setInterval(() => {
      innerFunc();
    }, this.snapInterval);

    // 首次事件，延时 500ms 发出
    setTimeout(innerFunc, 500);
  }

  /** 响应获取到的快照事件 */
  private applySnap(snap: WhiteboardSnap) {
    const { id, sources, pageIds, visiblePageIndex } = snap;

    if (!this.isInitialized && !this.isSyncing) {
      this.id = id;
      this.sources = sources;
      this.isSyncing = true;

      // 初始化所有的 WhitePages
      this.sources.forEach((source, i) => {
        const page = new WhitePage(
          { imgSrc: source },
          {
            mode: this.mode,
            whiteboard: this,
            parentContainer: this.pagesContainer
          }
        );
        page.id = pageIds[i];

        // 这里隐藏 Dashboard 的图片源，Siema 切换的是占位图片
        page.container.style.visibility = 'hidden';

        this.pages.push(page);

        page.open();
      });

      this.initSiema();
      this.isInitialized = true;
      this.isSyncing = false;
      this.onPageChange(visiblePageIndex);
    }

    // 如果已经初始化完毕，则进行状态同步
    this.onPageChange(snap.visiblePageIndex);

    // 同步 Pages
    (snap.pages || []).forEach(pageSnap => {
      const page = this.pageMap[pageSnap.id];

      if (page) {
        page.applySnap(pageSnap);
      }
    });
  }
}
