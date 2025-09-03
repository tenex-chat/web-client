import { useParams, useNavigate } from '@tanstack/react-router'
import { useNDK, useSubscribe, useNDKCurrentUser, useEvent, useProfileValue } from '@nostr-dev-kit/ndk-hooks'
import { useState, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Calendar, Hash, MessageSquare, Send, Bot, Tag, FileText } from 'lucide-react'
import { NDKAgentLesson } from '@/lib/ndk-events/NDKAgentLesson'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRelativeTime } from '@/lib/utils/time'
import { NostrProfile } from '@/components/common/NostrProfile'
import { toast } from 'sonner'
import { useMarkdownComponents } from '@/lib/markdown/config'

export function LessonView() {
  const { lessonId } = useParams({ from: '/_auth/lesson/$lessonId' })
  const navigate = useNavigate()
  const { ndk } = useNDK()
  const currentUser = useNDKCurrentUser()
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const markdownComponents = useMarkdownComponents()

  const lessonEvent = useEvent(lessonId);
  const lesson = useMemo(() => lessonEvent ? NDKAgentLesson.from(lessonEvent) : null, [lessonEvent]);

  const agentProfile = useProfileValue(lessonEvent?.pubkey);

  const { events: comments } = useSubscribe([{
    kinds: [1111], 
    "#e": [lessonId]
  }]);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || !currentUser || !ndk || !lesson) return

    setIsSubmittingComment(true)
    try {
      const event = lesson.reply();
      event.content = newComment

      await event.publish()
      setNewComment('')
      toast.success('Comment posted')
    } catch (error) {
      console.error('Failed to post comment:', error)
      toast.error('Failed to post comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }, [newComment, currentUser, ndk, lesson])

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading lesson...</div>
      </div>
    )
  }

  const renderLessonContent = () => {
    // Combine all content into a markdown-friendly format
    const sections = []
    
    // Main lesson (abridged version)
    sections.push(`## Lesson\n\n${lesson.lesson || 'No lesson content'}`)
    
    // Detailed version if available
    if (lesson.detailed) {
      sections.push(`## Detailed Explanation\n\n${lesson.detailed}`)
    }
    
    // Metacognition if available
    if (lesson.metacognition) {
      sections.push(`## Metacognition\n\n*Why this lesson matters:*\n\n${lesson.metacognition}`)
    }
    
    // Reasoning if available
    if (lesson.reasoning) {
      sections.push(`## Reasoning\n\n${lesson.reasoning}`)
    }
    
    // Reflection if available
    if (lesson.reflection) {
      sections.push(`## Reflection\n\n${lesson.reflection}`)
    }
    
    return sections.join('\n\n---\n\n')
  }

  return (
			<div className="h-full flex">
				{/* Main Content Area */}
				<div className="flex-1 flex flex-col">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b">
						<div className="flex items-center gap-3">
							<Button
								variant="ghost"
								size="icon"
								onClick={() =>
									lesson &&
									navigate({
										to: "/p/$pubkey",
										params: { pubkey: lesson.pubkey },
									})
								}
								className="h-9 w-9"
							>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<div className="flex items-center gap-3">
								<Avatar>
									<AvatarImage src={agentProfile?.picture} />
									<AvatarFallback>
										<Bot className="h-5 w-5" />
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="text-sm text-muted-foreground">
										{agentProfile?.name || "Agent"} / Lesson
									</p>
									<h1 className="text-xl font-semibold">
										{lesson.title || "Untitled Lesson"}
									</h1>
								</div>
							</div>
						</div>
					</div>

					{/* Content */}
					<ScrollArea className="flex-1">
						<div className="p-6 max-w-4xl mx-auto">
							{/* Metadata */}
							<div className="flex flex-wrap items-center gap-4 mb-6">
								<div className="flex items-center gap-1 text-sm text-muted-foreground">
									<Calendar className="h-4 w-4" />
									<span>{formatRelativeTime(lesson.created_at || 0)}</span>
								</div>
								{lesson.category && (
									<Badge variant="secondary" className="gap-1">
										<Tag className="h-3 w-3" />
										{lesson.category}
									</Badge>
								)}
								{lesson.detailed && (
									<Badge variant="default" className="gap-1">
										<FileText className="h-3 w-3" />
										Has Detailed Version
									</Badge>
								)}
							</div>

							{/* Tags */}
							{lesson.hashtags && lesson.hashtags.length > 0 && (
								<div className="flex flex-wrap gap-2 mb-6">
									{lesson.hashtags.map((tag) => (
										<Badge key={tag} variant="outline" className="gap-1">
											<Hash className="h-3 w-3" />
											{tag}
										</Badge>
									))}
								</div>
							)}

							{/* Lesson Content with Markdown */}
							<div className="prose prose-neutral dark:prose-invert max-w-none">
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									components={markdownComponents}
								>
									{renderLessonContent()}
								</ReactMarkdown>
							</div>
						</div>
					</ScrollArea>
				</div>

				{/* Comments Sidebar */}
				<div className="w-96 border-l flex flex-col bg-muted/30">
					<div className="p-4 border-b">
						<h2 className="font-semibold flex items-center gap-2">
							<MessageSquare className="h-4 w-4" />
							Comments ({comments.length})
						</h2>
					</div>

					<ScrollArea className="flex-1">
						<div className="p-4 space-y-4">
							{comments.length === 0 ? (
								<div className="text-center text-muted-foreground py-8">
									<MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
									<p className="text-sm">No comments yet</p>
									<p className="text-xs mt-1">
										Be the first to share your thoughts
									</p>
								</div>
							) : (
								comments.map((comment) => (
									<div key={comment.id} className="space-y-2">
										<div className="flex gap-3">
											<NostrProfile
												pubkey={comment.pubkey}
												variant="avatar"
												size="sm"
											/>
											<div className="flex-1 space-y-1">
												<div className="flex items-center gap-2">
													<NostrProfile
														pubkey={comment.pubkey}
														variant="name"
														className="font-medium text-sm"
													/>
													<span className="text-xs text-muted-foreground">
														{formatRelativeTime(comment.created_at || 0)}
													</span>
												</div>
												<p className="text-sm whitespace-pre-wrap break-words">
													{comment.content}
												</p>
											</div>
										</div>
										<Separator className="opacity-50" />
									</div>
								))
							)}
						</div>
					</ScrollArea>

					{/* Comment Input */}
					{currentUser && (
						<div className="p-4 border-t space-y-3">
							<Textarea
								placeholder="Share your thoughts on this lesson..."
								value={newComment}
								onChange={(e) => setNewComment(e.target.value)}
								className="resize-none"
								rows={3}
							/>
							<Button
								onClick={handleSubmitComment}
								disabled={!newComment.trim() || isSubmittingComment}
								className="w-full"
							>
								<Send className="h-4 w-4 mr-2" />
								{isSubmittingComment ? "Posting..." : "Post Comment"}
							</Button>
						</div>
					)}
				</div>
			</div>
		);
}