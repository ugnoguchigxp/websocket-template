import React, { useState } from 'react';
import { createContextLogger } from '@logger';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import DatePicker from '../components/ui/DatePicker';
import { NumberInput } from '../components/ui/NumberInput';
import { TimeInput } from '../components/ui/TimeInput';
import { TimeNumberInput } from '../components/ui/TimeNumberInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import Tooltip from '../components/ui/Tooltip';
import Drawer from '../components/ui/Drawer';
import { useNotificationContext } from '../contexts/NotificationContext';
import { Link } from 'react-router-dom';
const log = createContextLogger('ComponentsDemoPage');
export function ComponentsDemoPage() {
    const { showSuccess, showError, showWarning, showInfo } = useNotificationContext();
    // Button states
    const [buttonLoading, setButtonLoading] = useState(false);
    // Input states
    const [inputValue, setInputValue] = useState('');
    const [textareaValue, setTextareaValue] = useState('');
    // DatePicker states
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    // NumberInput states
    const [numberValue, setNumberValue] = useState(null);
    const [priceValue, setPriceValue] = useState(null);
    // TimeInput states
    const [timeValue, setTimeValue] = useState(null);
    const [timeNumberValue, setTimeNumberValue] = useState(null);
    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    // Drawer states
    const [drawerOpen, setDrawerOpen] = useState(false);
    log.info('ComponentsDemoPage rendered');
    return (<div className="min-h-screen bg-gray-100">
			<div className="max-w-7xl mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="text-4xl font-bold text-gray-900 mb-2">Component Demo</h1>
					<p className="text-gray-600">WebSocket Frameworkで使用可能なUIコンポーネント一覧</p>
				</div>

				<div className="space-y-8">
					{/* Button Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">Button</h2>
						<div className="space-y-4">
							<div>
								<h3 className="text-sm font-semibold text-gray-700 mb-2">Variants</h3>
								<div className="flex flex-wrap gap-3">
									<Button variant="default">Default</Button>
									<Button variant="destructive">Destructive</Button>
									<Button variant="outline">Outline</Button>
									<Button variant="secondary">Secondary</Button>
									<Button variant="ghost">Ghost</Button>
									<Button variant="link">Link</Button>
								</div>
							</div>
							<div>
								<h3 className="text-sm font-semibold text-gray-700 mb-2">Sizes</h3>
								<div className="flex flex-wrap items-center gap-3">
									<Button size="sm">Small</Button>
									<Button size="default">Default</Button>
									<Button size="lg">Large</Button>
								</div>
							</div>
							<div>
								<h3 className="text-sm font-semibold text-gray-700 mb-2">States</h3>
								<div className="flex flex-wrap gap-3">
									<Button disabled>Disabled</Button>
									<Button disabled={buttonLoading} onClick={() => {
            setButtonLoading(true);
            setTimeout(() => setButtonLoading(false), 2000);
        }}>
										{buttonLoading ? 'Loading...' : 'Click to Load'}
									</Button>
								</div>
							</div>
						</div>
					</section>

					{/* Input Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">Input</h2>
						<div className="space-y-4 max-w-md">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Text Input</label>
								<Input type="text" placeholder="Enter text..." value={inputValue} onChange={(e) => setInputValue(e.target.value)}/>
								{inputValue && <p className="text-sm text-gray-600 mt-1">Value: {inputValue}</p>}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Password Input</label>
								<Input type="password" placeholder="Enter password..."/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Disabled Input</label>
								<Input type="text" placeholder="Disabled" disabled value="Cannot edit"/>
							</div>
						</div>
					</section>

					{/* Textarea Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">Textarea</h2>
						<div className="space-y-4 max-w-md">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Multiline Text</label>
								<Textarea placeholder="Enter multiline text..." value={textareaValue} onChange={(e) => setTextareaValue(e.target.value)} rows={4}/>
								{textareaValue && (<p className="text-sm text-gray-600 mt-1">Characters: {textareaValue.length}</p>)}
							</div>
						</div>
					</section>

					{/* DatePicker Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">DatePicker</h2>
						<div className="space-y-4 max-w-md">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Single Date</label>
								<DatePicker value={selectedDate} onChange={setSelectedDate} label="日付を選択"/>
								{selectedDate && (<p className="text-sm text-gray-600 mt-1">
										Selected: {selectedDate.toLocaleDateString('ja-JP')}
									</p>)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
								<DatePicker selectsRange startDate={startDate} endDate={endDate} onRangeChange={([start, end]) => {
            setStartDate(start);
            setEndDate(end);
        }} label="期間を選択" monthsShown={2}/>
								{startDate && endDate && (<p className="text-sm text-gray-600 mt-1">
										Range: {startDate.toLocaleDateString('ja-JP')} -{' '}
										{endDate.toLocaleDateString('ja-JP')}
									</p>)}
							</div>
						</div>
					</section>

					{/* NumberInput Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">NumberInput</h2>
						<div className="space-y-4 max-w-md">
							<p className="text-gray-600">
								キーパッド付き数値入力フィールド。タップするとキーパッドモーダルが開きます。
							</p>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">整数入力</label>
								<NumberInput value={numberValue} onChange={(val) => {
            setNumberValue(val);
            if (val)
                showSuccess('入力完了', `値: ${val}`);
        }} label="数値を入力" placeholder="タップして入力" min={0} max={100}/>
								{numberValue !== null && (<p className="text-sm text-gray-600 mt-1">Value: {numberValue}</p>)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">小数点入力 (価格)</label>
								<NumberInput value={priceValue} onChange={(val) => {
            setPriceValue(val);
            if (val)
                showSuccess('価格入力完了', `¥${val.toLocaleString()}`);
        }} label="価格を入力" placeholder="タップして入力" min={0} allowDecimal={true}/>
								{priceValue !== null && (<p className="text-sm text-gray-600 mt-1">
										Price: ¥{priceValue.toLocaleString()}
									</p>)}
							</div>
						</div>
					</section>

					{/* TimeInput Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">TimeInput</h2>
						<div className="space-y-4 max-w-md">
							<p className="text-gray-600">
								キーパッド付き時刻入力フィールド。タップするとキーパッドモーダルが開きます。
							</p>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									時刻入力 (HH:MM形式)
								</label>
								<TimeInput value={timeValue} onChange={(val) => {
            setTimeValue(val);
            if (val)
                showSuccess('時刻入力完了', `時刻: ${val}`);
        }} label="時刻を入力" placeholder="タップして入力"/>
								{timeValue && <p className="text-sm text-gray-600 mt-1">Time: {timeValue}</p>}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									時刻入力 (4桁数値 HHMM形式)
								</label>
								<TimeNumberInput value={timeNumberValue} onChange={(numVal, formattedTime) => {
            setTimeNumberValue(numVal);
            if (numVal && formattedTime) {
                showSuccess('時刻入力完了', `数値: ${numVal} (${formattedTime})`);
            }
        }} label="時刻を4桁で入力" placeholder="タップして入力"/>
								{timeNumberValue !== null && (<p className="text-sm text-gray-600 mt-1">
										Value: {timeNumberValue} (
										{String(timeNumberValue).padStart(4, '0').slice(0, 2)}:
										{String(timeNumberValue).padStart(4, '0').slice(2, 4)})
									</p>)}
							</div>
						</div>
					</section>

					{/* Dialog Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">Dialog</h2>
						<div className="space-y-4">
							<p className="text-gray-600">モーダルダイアログコンポーネント</p>
							<Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
							<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Dialog Title</DialogTitle>
									</DialogHeader>
									<div className="space-y-4">
										<p className="text-gray-600">
											これはダイアログの内容です。任意のコンテンツを配置できます。
										</p>
										<div className="flex justify-end gap-2">
											<Button variant="outline" onClick={() => setDialogOpen(false)}>
												キャンセル
											</Button>
											<Button onClick={() => setDialogOpen(false)}>確定</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					</section>

					{/* Tooltip Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">Tooltip</h2>
						<div className="space-y-4">
							<p className="text-gray-600">ホバー時にヒントを表示するツールチップ</p>
							<div className="flex gap-4">
								<Tooltip text="これはツールチップです">
									<Button>Hover Me</Button>
								</Tooltip>
								<Tooltip text="詳細情報を表示します">
									<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm cursor-help">
										?
									</span>
								</Tooltip>
							</div>
						</div>
					</section>

					{/* Drawer Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">Drawer</h2>
						<div className="space-y-4">
							<p className="text-gray-600">画面端から表示されるスライドパネル</p>
							<Button onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
							<Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} position="right">
								<div className="p-4">
									<h3 className="text-xl font-bold mb-4">Drawer Content</h3>
									<p className="text-gray-600 mb-4">
										Drawerの内容をここに配置します。メニューや詳細情報の表示に便利です。
									</p>
									<Button onClick={() => setDrawerOpen(false)}>Close</Button>
								</div>
							</Drawer>
						</div>
					</section>

					{/* Notification Component */}
					<section className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">Notification</h2>
						<div className="space-y-4">
							<p className="text-gray-600">
								トースト通知システム。詳細は
								<Link to="/notification-demo" className="text-blue-600 hover:underline mx-1">
									Notification Demoページ
								</Link>
								をご覧ください。
							</p>
							<div className="flex flex-wrap gap-3">
								<Button variant="default" onClick={() => showInfo('情報', 'これは情報メッセージです')}>
									Info
								</Button>
								<Button variant="default" onClick={() => showSuccess('成功', '操作が正常に完了しました')}>
									Success
								</Button>
								<Button variant="default" onClick={() => showWarning('警告', '注意が必要な操作です')}>
									Warning
								</Button>
								<Button variant="destructive" onClick={() => showError('エラー', 'エラーが発生しました')}>
									Error
								</Button>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>);
}
